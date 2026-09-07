import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCatRig, catSpinePose, catApproach, createCatLegMount, catWakeEyes, catBapWeight, catPawReach } from '../components/console/catRig.ts';

test('cat skin preserves the original shape at rest and bends with the spine', () => {
  const body = new THREE.Group();
  const original = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, 1.05, 2, 2, 8), new THREE.MeshBasicMaterial());
  original.position.y = .03; body.add(original);
  const rig = createCatRig(body, [original]);
  const skin = rig.skins[0], positions = skin.geometry.getAttribute('position');
  const weights = skin.geometry.getAttribute('skinWeight');
  body.updateMatrixWorld(true); rig.skins[0].skeleton.update();
  for (let i = 0; i < positions.count; i++) {
    assert.ok(Math.abs(weights.getX(i) + weights.getY(i) - 1) < 1e-6);
    const point = new THREE.Vector3().fromBufferAttribute(positions, i);
    assert.ok(skin.applyBoneTransform(i, point.clone()).distanceTo(point) < 1e-6);
  }
  rig.spine.rotation.y = -.34; rig.shoulders.rotation.y = -.24;
  body.updateMatrixWorld(true); skin.skeleton.update();
  let frontDisplacement = 0;
  for (let i = 0; i < positions.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, i);
    const deformed = skin.applyBoneTransform(i, point.clone());
    assert.ok(Number.isFinite(deformed.length()));
    if (point.z < -.35) assert.ok(deformed.distanceTo(point) < 1e-6);
    if (point.z > .35) frontDisplacement = Math.max(frontDisplacement, deformed.distanceTo(point));
  }
  assert.ok(frontDisplacement > .1, 'shoulders must actually bend, not just rotate the root');
  rig.dispose(); original.geometry.dispose(); original.material.dispose();
});

test('settling poses have continuous joins and a stable final reduced-motion pose', () => {
  for (const ginger of [false, true]) {
    assert.deepEqual(catSpinePose(0, ginger), [0, 0, 0, 0, 0]);
    assert.deepEqual(catSpinePose(15, ginger), catSpinePose(100, ginger));
    for (const t of [5.2, 6, 6.1, 7.1, 7.4, 8.2, 9.4]) {
      const before = catSpinePose(t - 1e-5, ginger), after = catSpinePose(t + 1e-5, ginger);
      before.forEach((value, i) => assert.ok(Math.abs(value - after[i]) < .0001));
    }
  }
});


test('cats step through turns facing their travel direction, then stop turning', () => {
  for (const ginger of [false, true]) {
    const start = ginger ? 15 : -15;
    for (let t = 3.61; t < 4.95; t += .02) {
      const pose = catApproach(t, start, ginger), next = catApproach(t + .0001, start, ginger);
      const dx = next.x - pose.x, dz = next.z - pose.z;
      assert.ok(Math.hypot(dx, dz) > 0);
      assert.ok(pose.moving > 0);
      assert.ok(Math.abs(Math.atan2(dx, dz) - pose.yaw) < .001);
      assert.ok(next.gait > pose.gait);
    }
    const before = catApproach(3.6 - 1e-6, start, ginger), after = catApproach(3.6 + 1e-6, start, ginger);
    assert.ok(Math.hypot(before.x - after.x, before.z - after.z) < .0001);
    assert.ok(Math.abs(before.yaw - after.yaw) < .0001);
    assert.deepEqual(catApproach(5, start, ginger), catApproach(15, start, ginger));
  }
});


test('leg roots remain attached to shoulder and pelvis throughout sitting', () => {
  const body = new THREE.Group();
  const rig = createCatRig(body, []);
  const front = createCatLegMount(rig, 1, 1), rear = createCatLegMount(rig, -1, -1);
  assert.equal(front.parent, rig.shoulders);
  assert.equal(rear.parent, rig.pelvis);
  for (let t = 0; t <= 10; t += .1) {
    const pose = catSpinePose(t, false);
    rig.pelvis.rotation.x = pose[0]; rig.spine.rotation.x = pose[1]; rig.shoulders.rotation.x = pose[3];
    body.rotation.x = -.72; body.updateMatrixWorld(true);
    for (const joint of [front, rear]) {
      const inBone = joint.parent.worldToLocal(joint.getWorldPosition(new THREE.Vector3()));
      assert.ok(inBone.distanceTo(joint.position) < 1e-6);
      assert.equal(joint.position.y, -.19, 'joint must not move below the coat while sitting');
    }
  }
  rig.dispose();
});


test('Pumpkin wakes briefly then closes her eyes gradually; baps always return to rest', () => {
  assert.equal(catWakeEyes(0), 0);
  assert.equal(catWakeEyes(.2), 1);
  assert.equal(catWakeEyes(2.6), 1);
  assert.ok(catWakeEyes(3.2) > catWakeEyes(4));
  assert.equal(catWakeEyes(4.7), 0);
  assert.equal(catWakeEyes(Infinity), 0);
  assert.equal(catWakeEyes(0, true), 1);
  assert.equal(catWakeEyes(3, true), 0);
  assert.equal(catBapWeight(0), 0);
  assert.equal(catBapWeight(.12), 1);
  assert.equal(catBapWeight(.4), 0);
  assert.equal(catBapWeight(1), 0);
  assert.equal(catBapWeight(Infinity), 0);
});


test('Luna reaches with a bent elbow and bounded shoulder without stretching', () => {
  for (const target of [new THREE.Vector3(0, 0, .3), new THREE.Vector3(10, 10, -10), new THREE.Vector3(-10, -10, 10), new THREE.Vector3()]) {
    const pose = catPawReach(target, .361, .304);
    assert.ok(pose.elbow > .5 && pose.elbow < Math.PI);
    assert.ok(Math.abs(pose.yaw) <= .6);
    assert.ok(pose.shoulder >= -1.45 && pose.shoulder <= .8);
    Object.values(pose).forEach(value => assert.ok(Number.isFinite(value)));
  }
});
