'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createCatRig, catSpinePose, catApproach, createCatLegMount, catWakeEyes, catBapWeight, catPawReach } from './catRig';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ease = (n: number) => { const t = THREE.MathUtils.clamp(n, 0, 1); return t * t * (3 - 2 * t); };

// Articulated, lightly beveled models retain the low-resolution save-icon finish.
export default function AboutCats({ reduced }: { reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const motion = useRef(reduced); motion.current = reduced;
  useEffect(() => {
    const anchor = host.current;
    const surface = anchor?.closest<HTMLElement>('.screen-content');
    if (!anchor || !surface) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setSize(600, 190, false); renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'about-cats-scene';
    surface.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4.6, 4.6, 2.5, -.42, .1, 40);
    camera.position.set(0, 3.7, 9); camera.lookAt(0, .9, 0);
    let entryLeft = -8, entryRight = 8, lastLayout = '';
    const layout = () => {
      const bounds = surface.getBoundingClientRect(), target = anchor.getBoundingClientRect();
      if (!bounds.width || !bounds.height || !target.width || !target.height) return;
      // Preserve the heading-sized models, but extend their camera across the entire
      // console. The scroll panel is only an anchor, never the rendering boundary.
      const scale = Math.min(target.width / 600, target.height / 190);
      const left = target.left - bounds.left + (target.width - 600 * scale) / 2;
      const top = target.top - bounds.top + (target.height - 190 * scale) / 2 - target.height * .16;
      const width = bounds.width / scale, height = bounds.height / scale;
      const key = [left, top, width, height, scale].join(',');
      if (key === lastLayout) return;
      lastLayout = key;
      camera.setViewOffset(600, 190, -left / scale, -top / scale, width, height);
      const resolution = Math.min(1, 1000 / bounds.width);
      renderer.setSize(Math.round(bounds.width * resolution), Math.round(bounds.height * resolution), false);
      entryLeft = -4.6 - left / scale * 9.2 / 600 - 2.2;
      entryRight = -4.6 + (bounds.width - left) / scale * 9.2 / 600 + 2.2;
    };
    layout();
    scene.add(new THREE.AmbientLight(0xf1f1e6, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-3, 5, 4); scene.add(light);
    const rim = new THREE.DirectionalLight(0xb7c2d0, 1.5); rim.position.set(3, 2, -3); scene.add(rim);
    // One bevel segment keeps broad low-poly faces while softening the silhouette.
    const geometry = new RoundedBoxGeometry(1, 1, 1, 1, .16);
    const earGeometry = new THREE.ConeGeometry(.5, 1, 4);
    earGeometry.rotateY(Math.PI / 4);
    const materials = new Map<number, THREE.MeshStandardMaterial>();
    const block = (parent: THREE.Object3D, size: number[], pos: number[], color: number, shape: THREE.BufferGeometry = geometry) => {
      if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true }));
      const mesh = new THREE.Mesh(shape, materials.get(color));
      mesh.scale.set(...size as [number, number, number]); mesh.position.set(...pos as [number, number, number]); parent.add(mesh); return mesh;
    };
    const cats = [false, true].map(ginger => {
      const coat = ginger ? 0xc98737 : 0x40372e, dark = ginger ? 0x97571f : 0x1c1b19, cream = ginger ? 0xe9bb74 : 0x91806a;
      const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
      scene.add(root); root.add(body); body.add(head);
      block(body, [.62, .60, 1.05], [0, 0, 0], coat);
      block(body, [.52, .48, .36], [0, .03, -.49], coat);
      block(body, [.48, .42, .25], [0, .02, .48], ginger ? cream : 0x635343);
      for (let i = 0; i < 5; i++) {
        block(body, [.635, .12, .09], [0, .05, -.40 + i * .20], dark);
        block(body, [.35, .025, .13], [0, .306, -.40 + i * .20], dark);
      }
      block(head, [.57, .46, .44], [0, 0, 0], coat);
      block(head, [.46, .13, .15], [0, -.17, .23], cream);
      block(head, [.10, .07, .055], [0, -.10, .325], ginger ? 0xc17d79 : 0x665045);
      const eyes = [-1, 1].map(side => {
        const eye = new THREE.Group(); eye.position.set(side * .17, .015, .229); head.add(eye);
        block(eye, [.16, .13, .035], [0, 0, 0], ginger ? 0xc7b15e : 0xa3a267);
        block(eye, [.065, .115, .04], [0, 0, .022], 0x17191b); return eye;
      });
      const ears = [-1, 1].map(side => {
        const ear = new THREE.Group(); ear.position.set(side * .20, .20, -.025); head.add(ear);
        block(ear, [.29, .34, .25], [side * .015, .11, -.01], coat, earGeometry);
        block(ear, [.15, .22, .035], [side * .015, .085, .071], ginger ? 0xb18477 : 0x806159, earGeometry);
        return ear;
      });
      [-1, 1].forEach(side => {
        block(head, [.065, .13, .026], [side * .075, .14, .23], dark);
        block(head, [.11, .06, .026], [side * .24, -.095, .23], dark);
      });
      if (ginger) {
        for (let i = 0; i < 5; i++) block(body, [.69 - i * .065, .12, .26], [0, .17 - i * .1, .43], cream);
        block(body, [.70, .42, .62], [0, -.07, -.25], coat);
        block(body, [.42, .10, .44], [0, .34, -.15], coat);
      }
      // Torso markings deform with the coat, keeping stripes on the surface.
      const rig = createCatRig(body, body.children.filter((part): part is THREE.Mesh => part instanceof THREE.Mesh));
      body.remove(head); rig.shoulders.add(head);
      const legs = [-1, 1].flatMap(side => [-1, 1].map(front => {
        const leg = createCatLegMount(rig, front, side);
        leg.rotation.order = 'YXZ';
        const upperMesh = block(leg, [.18, .23, .19], [0, -.085, 0], coat);
        const band = block(leg, [.185, .065, .195], [0, -.12, 0], dark);
        const knee = new THREE.Group(); knee.position.y = -.19; leg.add(knee);
        const lowerMesh = block(knee, [.15, .19, .16], [0, -.075, 0], coat);
        const paw = new THREE.Group(); paw.position.set(0, -.16, 0); knee.add(paw);
        block(paw, [.20, .15, .29], [0, 0, .05], ginger ? cream : 0x544638);
        return { leg, knee, paw, front, side, upperMesh, lowerMesh, band };
      }));
      const tail = new THREE.Group(); tail.position.set(0, .05, -.17); rig.pelvis.add(tail);
      const segments: THREE.Group[] = []; let parent = tail;
      for (let i = 0; i < 9; i++) {
        const segment = new THREE.Group(); segment.position.z = i ? -.14 : 0; parent.add(segment);
        const width = (ginger ? .22 : .13) * (1 - i * .045);
        block(segment, [width, width, .18], [0, 0, -.07], i % 3 === 2 ? dark : coat);
        segments.push(segment); parent = segment;
      }
      const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x0b1028, transparent: true, opacity: .24, depthWrite: false });
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(.65, 24), shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.scale.y = 1.35; shadow.position.y = -.035; root.add(shadow);
      return { root, body, head, eyes, ears, legs, segments, shadow, ginger, rig };
    });
    const pointer = { x: 0, y: 0, present: false };
    const gaze = { yaw: 0, pitch: 0 };
    const headScreen = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const clickPoint = new THREE.Vector2();
    const bap = { started: -Infinity, side: 1, target: new THREE.Vector3() };
    const localTarget = new THREE.Vector3();
    let interactionTime = 0, pumpkinWake = -Infinity;
    const interactWithCats = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a, button, input, select')) return;
      const bounds = surface.getBoundingClientRect();
      clickPoint.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
        1 - (event.clientY - bounds.top) / bounds.height * 2);
      scene.updateMatrixWorld(true); camera.updateMatrixWorld();
      cats[1].rig.skins.forEach(skin => { skin.computeBoundingSphere(); });
      raycaster.setFromCamera(clickPoint, camera);
      if (raycaster.intersectObject(cats[1].root, true).some(hit => hit.object !== cats[1].shadow)) {
        pumpkinWake = interactionTime;
        return;
      }
      if (motion.current || time < 7.4 || interactionTime - bap.started < .45) return;
      cats[0].head.getWorldPosition(headScreen).project(camera);
      const x = bounds.left + (headScreen.x + 1) * .5 * bounds.width;
      const y = bounds.top + (1 - headScreen.y) * .5 * bounds.height;
      const radius = Math.min(85, THREE.MathUtils.clamp(bounds.width * .20, 130, 240) * .46);
      if (Math.hypot(event.clientX - x, event.clientY - y) < radius) {
        bap.started = interactionTime;
        bap.side = event.clientX < x ? -1 : 1;
        bap.target.set(clickPoint.x, clickPoint.y, headScreen.z).unproject(camera);
      }
    };
    surface.addEventListener('click', interactWithCats);
    const trackPointer = (event: PointerEvent) => {
      pointer.present = event.pointerType === 'mouse';
      pointer.x = event.clientX; pointer.y = event.clientY;
    };
    const releasePointer = () => { pointer.present = false; };
    surface.addEventListener('pointermove', trackPointer, { passive: true });
    surface.addEventListener('pointerleave', releasePointer);
    window.addEventListener('blur', releasePointer);
    const visibility = () => { if (document.hidden) releasePointer(); };
    document.addEventListener('visibilitychange', visibility);
    let frame = 0, previous = 0, time = 0;
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now;
      if (document.hidden) return;
      layout();
      interactionTime += dt;
      if (!motion.current) time += dt;
      cats.forEach(({ root, body, head, eyes, ears, legs, segments, shadow, ginger, rig }, index) => {
        const t = motion.current ? 15 : Math.max(0, time - index * 1.1);
        const settle = ease((t - 5.2) / 2.2);
        // Finish turning before lowering: forelegs yield, haunches tuck, then
        // the chin and tail come to rest. Separate timings avoid a rigid pivot.
        const lowerChest = ease((t - 6.0) / 1.15);
        const tuckHips = ease((t - 6.8) / 1.35);
        const curlHead = ease((t - 7.85) / 1.55);
        const wrapTail = ease((t - 7.4) / 1.9);
        const sleepy = ease((t - 8.7) / 1.1);
        const approach = catApproach(t, ginger ? entryRight : entryLeft, ginger);
        const moving = motion.current ? 0 : approach.moving;
        root.position.set(approach.x, 0, approach.z);
        root.rotation.y = approach.yaw;
        // Keep stepping throughout the bend; face the actual direction of travel.
        const stride = approach.gait * Math.PI * 2;
        const flight = (1 - Math.cos(stride * 2)) * .5;
        const bounce = flight * .035 * moving;
        const pitch = Math.sin(stride * 2 - .4) * .018 * moving;
        const breath = motion.current ? 0 : Math.sin(t * 2.1 + index) * .008 * settle;
        const restTime = Math.max(0, t - 5.2);
        const restSway = Math.sin(restTime * 5) * Math.exp(-restTime * 1.8) * .055 * (motion.current ? 0 : 1);
        body.position.y = .56 + bounce + settle * (ginger ? -.16 : .09) + breath + restSway;
        body.rotation.x = settle * (ginger ? .06 : -.72) + pitch;
        body.rotation.z = 0;
        if (ginger) {
          body.position.y = .56 + bounce - .11 * lowerChest - .075 * tuckHips + breath;
          body.position.z = -.055 * lowerChest + .075 * tuckHips;
          body.rotation.x = pitch + .11 * lowerChest * (1 - tuckHips);
        }
        body.scale.set(1 + (ginger ? tuckHips * .14 : 0),
          1 + breath, 1 - (ginger ? tuckHips : settle) * .07);
        const pose = catSpinePose(t, ginger);
        const flex = Math.sin(stride * 2) * .022 * moving;
        rig.pelvis.rotation.set(pose[0] - flex * .4, 0, 0);
        rig.spine.rotation.set(pose[1] + flex, pose[2], 0);
        rig.shoulders.rotation.set(pose[3] - flex * .6, pose[4], 0);
        head.position.set(ginger ? curlHead * .10 : 0,
          .28 - (ginger ? .07 * lowerChest + .25 * curlHead : 0) - bounce * .8,
          .17 - (ginger ? .035 * curlHead : 0));
        head.rotation.set((ginger ? .12 * lowerChest * (1 - curlHead) - .12 * curlHead : settle * .66) - pitch * .65 + Math.sin(stride - .9) * .008 * moving,
          (ginger ? -.16 * curlHead : 0) + Math.sin(t * .65) * .045 * (motion.current ? 0 : ginger ? 1 - curlHead : 1),
          -body.rotation.z * .6);
        if (!ginger) {
          let yawTarget = 0, pitchTarget = 0;
          if (pointer.present && !motion.current && settle === 1) {
            // Project the head through the same full-screen camera used to draw
            // it, so pointer range follows scrolling, resizing and CRT scaling.
            camera.updateMatrixWorld();
            head.getWorldPosition(headScreen).project(camera);
            const bounds = surface.getBoundingClientRect();
            const x = bounds.left + (headScreen.x + 1) * .5 * bounds.width;
            const y = bounds.top + (1 - headScreen.y) * .5 * bounds.height;
            const dx = pointer.x - x, dy = pointer.y - y;
            const radius = THREE.MathUtils.clamp(bounds.width * .20, 130, 240);
            const range = Math.hypot(dx, dy) / radius;
            // Fade the outer edge of her attention instead of snapping at it.
            const attention = 1 - ease((range - .75) / .25);
            yawTarget = THREE.MathUtils.clamp(dx / radius * 1.2, -.65, .65) * attention;
            pitchTarget = THREE.MathUtils.clamp(dy / radius * .75, -.32, .38) * attention;
          }
          const follow = motion.current ? 1 : 1 - Math.exp(-dt * 7);
          gaze.yaw += (yawTarget - gaze.yaw) * follow;
          gaze.pitch += (pitchTarget - gaze.pitch) * follow;
          head.rotation.y += gaze.yaw;
          head.rotation.x += gaze.pitch;
        }
        legs.forEach(({ leg, knee, paw, front, side, upperMesh, lowerMesh, band }) => {
          leg.rotation.set(0, 0, 0);
          // Diagonal partners share contact timing. Each paw travels backward
          // along the floor, then lifts in a low arc for its recovery stroke.
          const phase = ((stride / (Math.PI * 2) + (front === side ? 0 : .5)) % 1 + 1) % 1;
          const contact = .58;
          const recovery = Math.max(0, (phase - contact) / (1 - contact));
          const footZ = phase < contact ? .14 - .28 * phase / contact : -.14 + .28 * ease(recovery);
          const lift = phase < contact ? 0 : Math.sin(recovery * Math.PI) ** 2 * .105;
          // Extend connected forelegs as Luna sits; never translate the entire
          // leg away from the shoulder to reach the ground.
          const extension = !ginger && front > 0 ? 1 + settle * .90 : 1;
          // Lengthen the segments, not the joint coordinate system: nonuniform
          // scale on a rotating shoulder shears the elbow during a reach.
          upperMesh.scale.y = .23 * extension; upperMesh.position.y = -.085 * extension;
          band.position.y = -.12 * extension;
          knee.position.y = -.19 * extension;
          lowerMesh.scale.y = .19 * extension; lowerMesh.position.y = -.075 * extension;
          paw.position.y = -.16 * extension;
          // Solve the two leg joints from the paw position instead of swinging
          // disconnected joints. Compensate for body bounce to preserve contact.
          const targetY = .075 - (.56 + bounce) + lift;
          const targetZ = front * .37 + footZ;
          const y = targetY * Math.cos(pitch) + targetZ * Math.sin(pitch) + .19;
          const z = -targetY * Math.sin(pitch) + targetZ * Math.cos(pitch) - front * .37;
          const upper = .19, lower = .16;
          const reach = THREE.MathUtils.clamp(Math.hypot(y, z), .04, upper + lower - .001);
          const bend = (front > 0 ? -1 : 1) * Math.acos(THREE.MathUtils.clamp(
            (reach * reach - upper * upper - lower * lower) / (2 * upper * lower), -1, 1));
          const hip = Math.atan2(-z, -y) - Math.atan2(lower * Math.sin(bend), upper + lower * Math.cos(bend));
          const restHip = settle * (ginger ? -1.1 : front < 0 ? -1.25 : .72);
          leg.rotation.x = hip * moving + restHip;
          knee.rotation.x = bend * moving;
          paw.rotation.x = -(hip + bend + pitch) * moving;
          if (ginger) {
            // Keep the supporting paws at floor level while the shoulders lower.
            // Once weight is down, draw each paw under the chest/haunch in turn.
            const fold = front > 0 ? ease((t - 7.05 - (side + 1) * .12) / 1.25)
              : ease((t - 6.8 - (side + 1) * .08) / 1.35);
            const pawZ = front * .37 + (front > 0 ? .09 - .14 * fold : .12 * fold);
            const floorY = .075 - body.position.y;
            const restingPitch = body.rotation.x;
            const localY = floorY * Math.cos(restingPitch) + pawZ * Math.sin(restingPitch) + .19;
            const localZ = -floorY * Math.sin(restingPitch) + pawZ * Math.cos(restingPitch) - front * .37;
            const restingReach = THREE.MathUtils.clamp(Math.hypot(localY, localZ), .04, upper + lower - .001);
            const restingBend = (front > 0 ? -1 : 1) * Math.acos(THREE.MathUtils.clamp(
              (restingReach * restingReach - upper * upper - lower * lower) / (2 * upper * lower), -1, 1));
            const restingHip = Math.atan2(-localZ, -localY)
              - Math.atan2(lower * Math.sin(restingBend), upper + lower * Math.cos(restingBend));
            leg.rotation.x = hip * moving + restingHip * (1 - moving);
            knee.rotation.x = bend * moving + restingBend * (1 - moving);
            paw.rotation.x = -(leg.rotation.x + knee.rotation.x + restingPitch);
          }
          const mountPitch = rig.pelvis.rotation.x + (front > 0 ? rig.spine.rotation.x + rig.shoulders.rotation.x : 0);
          leg.rotation.x -= mountPitch;
          if (!ginger && front > 0 && side === bap.side && !motion.current) {
            const reach = catBapWeight(interactionTime - bap.started);
            if (reach > 0) {
              localTarget.copy(bap.target);
              leg.parent!.worldToLocal(localTarget).sub(leg.position);
              const joints = catPawReach(localTarget, .19 * extension, .16 * extension);
              leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, joints.shoulder, reach);
              leg.rotation.y = joints.yaw * reach;
              knee.rotation.x = THREE.MathUtils.lerp(knee.rotation.x, joints.elbow, reach);
              // A small wrist flex makes a soft tap, rather than a stiff paddle.
              const wrist = -.25 - .22 * Math.sin(Math.min(1, (interactionTime - bap.started) / .28) * Math.PI);
              paw.rotation.x = THREE.MathUtils.lerp(paw.rotation.x, wrist, reach);
            }
          }
        });
        segments.forEach((segment, i) => {
          segment.rotation.x = -.16 * (1 - (ginger ? wrapTail : settle))
            + Math.sin(stride - i * .40 - 1) * .018 * moving
            + Math.sin(t * 1.5 - i * .35) * .025 * (motion.current ? 0 : 1);
          segment.rotation.y = (ginger ? -.38 * ease((t - 7.4 - i * .065) / 1.6) : settle * .28)
            + Math.sin(stride * .5 - i * .3) * .018 * moving
            + Math.sin(t * 1.2 - i * .4) * .035 * (motion.current ? 0 : 1);
        });
        shadow.scale.set(1 - flight * .15 * moving, 1.35 - flight * .18 * moving, 1);
        shadow.material.opacity = .24 - flight * .09 * moving;
        const blink = motion.current ? 1 : 1 - .95 * Math.max(0, 1 - Math.abs((t + index * 2.7) % 5.3 - 4.9) / .12);
        const wake = ginger ? catWakeEyes(interactionTime - pumpkinWake, motion.current) : 0;
        eyes.forEach(eye => {
          const resting = ginger ? (1 - sleepy) * blink + sleepy * .10 : blink;
          eye.scale.y = THREE.MathUtils.lerp(resting, 1, wake);
        });
        ears.forEach((ear, i) => {
          ear.rotation.x = Math.sin(stride - 1.2) * .025 * moving;
          ear.rotation.z = motion.current ? 0 : Math.sin(t * 2 + i) * .12 * Math.max(0, Math.sin(t * .7 + index) - .8);
        });
      });
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);
    return () => {
      surface.removeEventListener('click', interactWithCats);
      surface.removeEventListener('pointermove', trackPointer);
      surface.removeEventListener('pointerleave', releasePointer);
      window.removeEventListener('blur', releasePointer);
      document.removeEventListener('visibilitychange', visibility);
      cancelAnimationFrame(frame); geometry.dispose(); earGeometry.dispose(); materials.forEach(material => material.dispose());
      cats.forEach(cat => { cat.rig.dispose(); cat.shadow.geometry.dispose(); cat.shadow.material.dispose(); });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);
  return <div className="about-cats" ref={host}><span className="sr-only">Luna, a striped tabby, sits beside Pumpkin, a fluffy ginger cat curled up asleep.</span></div>;
}
