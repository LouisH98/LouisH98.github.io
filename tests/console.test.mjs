import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { bootFrame, BOOT_DURATION } from '../lib/console/timeline.ts';
import { parseHash, routeHash } from '../lib/console/navigation.ts';
import { projects } from '../lib/console/content.ts';
import { asset } from '../lib/console/assets.ts';

test('boot follows a reference title, flight, and continuous orb handoff', () => {
  assert.equal(bootFrame(0).title, 0);
  assert.equal(bootFrame(1).title, 1);
  assert.equal(bootFrame(0).travel, 0);
  assert.ok(bootFrame(1).travel > 0 && bootFrame(1).travel < bootFrame(3).travel);
  assert.ok(bootFrame(6).travel > 0);
  assert.equal(bootFrame(BOOT_DURATION - .01).complete, false);
  assert.equal(bootFrame(BOOT_DURATION).complete, true);
  assert.equal(bootFrame(BOOT_DURATION).field, 0);
  assert.equal(bootFrame(BOOT_DURATION).morph, 1);
  assert.equal(bootFrame(8.15).field, 1);
  assert.ok(bootFrame(8.6).field > 0 && bootFrame(8.6).field < 1);
  assert.equal(bootFrame(9.05).field, 0);
  assert.equal(bootFrame(9.05).morph, 0);
  // A long, nearly stationary opening followed by an accelerating dive.
  assert.ok(bootFrame(6).travel < .11);
  assert.ok(bootFrame(8.5).travel > .75);
  let previous = bootFrame(0);
  for (let t=.01;t<=9.05;t+=.01) {
    const current = bootFrame(t);
    assert.ok(current.height <= previous.height);
    assert.ok(current.rotation <= previous.rotation);
    previous = current;
  }
  for (let t=0;t<=20;t+=.1) for (const key of ['title','travel','field','morph']) assert.ok(bootFrame(t)[key]>=0 && bootFrame(t)[key]<=1);
});
test('all hash routes survive serialization, invalid project IDs return to browser', () => {
  const routes = ['menu','browser','about','settings'].map(view=>({view}));
  routes.push(...projects.map(p=>({view:'project',projectId:p.id})));
  for(const route of routes) assert.deepEqual(parseHash(routeHash(route)),route);
  assert.deepEqual(parseHash('#/project/missing'),{view:'browser'});
  assert.deepEqual(parseHash('#/%E0%A4%A'),{view:'menu'});
  assert.deepEqual(parseHash(''),{view:'menu'});
});
test('asset URLs support root and GitHub project Pages', () => {
  globalThis.__PAGES_BASE_PATH__ = '';
  assert.equal(asset('/audio/startup-reference.wav'),'/audio/startup-reference.wav');
  globalThis.__PAGES_BASE_PATH__ = '/ps2folio';
  assert.equal(asset('project-images/loveprint.png'),'/ps2folio/project-images/loveprint.png');
});
test('all project media, including reduced-motion stills, are local and present', async () => {
  assert.deepEqual(projects.map(p=>p.id),['print-scheduler','the-screen','loveprint']);
  for (const project of projects) {
    assert.equal(new URL(project.url).protocol,'https:');
    for(const path of [project.image,...project.sections.map(s=>s.image).filter(Boolean)]) {
      assert.ok(!path.startsWith('http'));
      await access(`public/${path}`);
      if(/\.mp4$/i.test(path)) await access(`public/${path.replace(/\.mp4$/i,'.webp')}`);
    }
  }
});

test('CRT zoom preserves the opening and fills the viewport before boot ends', async () => {
  const { crtZoom, crtLayout, CRT_ZOOM_START, CRT_ZOOM_END } = await import('../lib/console/crt.ts');
  assert.equal(crtZoom(0), 0);
  assert.equal(crtZoom(CRT_ZOOM_START), 0);
  assert.equal(crtZoom(CRT_ZOOM_END), 1);
  assert.ok(CRT_ZOOM_END < BOOT_DURATION);
  for (const [width, height] of [[1440,900],[390,844],[844,390],[320,568],[2560,1080]]) {
    const initial = crtLayout(width, height, 0);
    assert.ok(initial.left >= 0 && initial.top >= 0);
    assert.ok(initial.width <= width && initial.height <= height);
    const full = crtLayout(width, height, 1);
    assert.ok(Math.abs(full.left + full.width * .08) < .001);
    assert.ok(Math.abs(full.top + full.height * .095) < .001);
    assert.ok(Math.abs(full.width * .84 - width) < .001);
    assert.ok(Math.abs(full.height * .70 - height) < .001);
    let previous = initial;
    for (let t = CRT_ZOOM_START; t <= BOOT_DURATION; t += .05) {
      const current = crtLayout(width, height, crtZoom(t));
      assert.ok(current.width >= previous.width && current.height >= previous.height);
      previous = current;
    }
  }
});

test('CRT ignition opens a horizontal beam before expanding into a continuously visible full raster', async () => {
  const { crtPowerFrame, CRT_POWER_DURATION } = await import('../lib/console/crt.ts');
  assert.equal(crtPowerFrame(0).opacity, 0);
  const line = crtPowerFrame(.42);
  assert.equal(line.width, 1);
  assert.equal(line.height, .004);
  assert.equal(line.opacity, 1);
  const opening = crtPowerFrame(.65);
  assert.ok(opening.height > line.height && opening.height < 1);
  assert.equal(crtPowerFrame(CRT_POWER_DURATION).opacity, 1);
  for (let t = .08; t <= CRT_POWER_DURATION; t += .01) assert.equal(crtPowerFrame(t).opacity, 1);
  assert.equal(crtPowerFrame(CRT_POWER_DURATION).height, 1);
});

test('bedroom camera starts front-on and enters the screen on desktop and mobile', async () => {
  const { bedroomCameraFrame } = await import('../lib/console/bedroomCamera.ts');
  for(const [width,height] of [[1440,900],[390,844],[844,390],[320,568],[2560,1080]]) {
    const start=bedroomCameraFrame(width,height,0), aligned=bedroomCameraFrame(width,height,.65),end=bedroomCameraFrame(width,height,1);
    assert.equal(start.x,0);assert.equal(start.y,.11);assert.ok(start.z>end.z);
    assert.equal(aligned.x,0);assert.ok(Math.abs(aligned.y-.11)<1e-9);
    assert.equal(aligned.handoff,0);assert.equal(end.handoff,1);
    assert.ok(end.z>.72);
    const projectedHeight=(end.z-.72)*Math.tan(Math.PI/9)*2;
    // The camera reaches the glass before the composited fullscreen handoff ends.
    assert.ok(projectedHeight<=2.25);
    assert.ok(projectedHeight*width/height<=3);
    let previous=start.z;
    for(let p=0;p<=1;p+=.01){const frame=bedroomCameraFrame(width,height,p);assert.ok(frame.z<=previous);previous=frame.z;}
  }
});

test('window light travels behind the monitor onto the bed, never across its face', async () => {
  const { windowLightAtX, WINDOW_LIGHT } = await import('../lib/console/windowLight.ts');
  for(const x of [-1.75,0,1.75]) {
    const beam=windowLightAtX(x);
    assert.ok(beam.z+WINDOW_LIGHT.halfSize.z < .48, 'entire beam is behind the monitor face');
  }
  const bed=windowLightAtX(3.6);
  assert.ok(bed.z > -5.3 && bed.z < -2.5);
  assert.ok(Math.abs(bed.y-(-1.08))<.15);
  const window=windowLightAtX(WINDOW_LIGHT.origin.x);
  assert.deepEqual(window,WINDOW_LIGHT.origin);
});
