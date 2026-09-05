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
      if(/\.mp4$/i.test(path)) await access(`public/${path.replace(/\.mp4$/i,'.png')}`);
    }
  }
});
