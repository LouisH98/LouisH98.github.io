import * as THREE from 'three';

// A small deforming backbone is enough for these screen-sized characters.
// Head/tail follow its ends; the existing leg IK remains independently controlled.
export function createCatRig(body: THREE.Group, meshes: THREE.Mesh[]) {
  const pelvis = new THREE.Bone(), spine = new THREE.Bone(), shoulders = new THREE.Bone();
  pelvis.name = 'pelvis'; spine.name = 'spine'; shoulders.name = 'shoulders';
  pelvis.position.z = -.35; spine.position.z = .35; shoulders.position.z = .35;
  body.add(pelvis); pelvis.add(spine); spine.add(shoulders);
  body.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([pelvis, spine, shoulders]);
  const skins = meshes.map(mesh => {
    mesh.updateMatrix();
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrix);
    const vertices = geometry.getAttribute('position');
    const indices: number[] = [], weights: number[] = [];
    for (let i = 0; i < vertices.count; i++) {
      const along = THREE.MathUtils.clamp((vertices.getZ(i) + .35) / .35, 0, 2);
      const first = Math.min(1, Math.floor(along)), blend = along - first;
      indices.push(first, first + 1, 0, 0);
      weights.push(1 - blend, blend, 0, 0);
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const skin = new THREE.SkinnedMesh(geometry, mesh.material);
    body.add(skin); skin.bind(skeleton);
    // Small models near the screen edge must not use their undeformed bounds.
    skin.frustumCulled = false;
    body.remove(mesh);
    return skin;
  });
  return {
    pelvis, spine, shoulders, skins,
    dispose() { skins.forEach(skin => skin.geometry.dispose()); skeleton.dispose(); },
  };
}

// Authored spine poses: [time, pelvis pitch, spine pitch, spine turn,
// shoulder pitch, shoulder turn]. Angles are local to the preceding joint.
type Pose = readonly [number, number, number, number, number, number];
const pumpkin: readonly Pose[] = [
  [0, 0, 0, 0, 0, 0],
  [6, 0, 0, 0, 0, 0],
  [7.1, -.06, .12, 0, .06, 0], // Chest yields while haunches stay up.
  [8.2, .08, -.12, -.18, .02, -.12], // Weight settles; back starts curling.
  [9.4, .06, -.10, -.34, .04, -.24], // Neck follows the curve of the torso.
];
const luna: readonly Pose[] = [
  [0, 0, 0, 0, 0, 0],
  [5.2, 0, 0, 0, 0, 0],
  [6.1, .10, -.15, 0, .04, 0],
  [7.4, .06, -.10, 0, .04, 0],
];
export function catSpinePose(time: number, ginger: boolean): number[] {
  const poses = ginger ? pumpkin : luna;
  let index = 1;
  while (index < poses.length - 1 && time > poses[index][0]) index++;
  const from = poses[index - 1], to = poses[index];
  const t = THREE.MathUtils.clamp((time - from[0]) / (to[0] - from[0]), 0, 1);
  const blend = t * t * (3 - 2 * t);
  return from.slice(1).map((value, i) => THREE.MathUtils.lerp(value, to[i + 1], blend));
}

// Walk through a bend rather than rotating after translation has stopped.
export function catApproach(time: number, start: number, ginger: boolean) {
  const direction = ginger ? -1 : 1;
  const destination = ginger ? 1.55 : -1.55;
  const corner = destination - direction * 1.05;
  const control = destination - direction * .166;
  const turnStart = 3.6, turnDuration = 1.4;
  if (time < turnStart) {
    const u = THREE.MathUtils.clamp(time / turnStart, 0, 1);
    // Match the translational speed of the beginning of the curved segment.
    const endSpeed = 4 * Math.abs(control - corner) / turnDuration;
    const endSlope = Math.min(.9, endSpeed * turnStart / Math.max(.01, Math.abs(corner - start)));
    const progress = (-2 * u ** 3 + 3 * u * u) + (u ** 3 - 2 * u * u + u) + endSlope * (u ** 3 - u * u);
    return { x: THREE.MathUtils.lerp(start, corner, progress), z: -.65,
      yaw: direction * Math.PI / 2, gait: progress * 9, moving: 1 };
  }
  const t = THREE.MathUtils.clamp((time - turnStart) / turnDuration, 0, 1);
  const u = 2 * t - t * t, inverse = 1 - u;
  const x = inverse * inverse * corner + 2 * inverse * u * control + u * u * destination;
  const z = -.65 * (1 - u * u);
  const dx = 2 * (inverse * (control - corner) + u * (destination - control));
  const dz = 1.3 * u;
  const fade = THREE.MathUtils.clamp((t - .55) / .45, 0, 1);
  return { x, z, yaw: Math.atan2(dx, dz), gait: 9 + u * 1.7,
    moving: 1 - fade * fade * (3 - 2 * fade) };
}


export function createCatLegMount(rig: ReturnType<typeof createCatRig>, front: number, side: number) {
  const mount = new THREE.Group();
  // Joint origins stay inside the coat, in the corresponding bone's space.
  mount.position.set(side * .22, -.19, front * .02);
  (front > 0 ? rig.shoulders : rig.pelvis).add(mount);
  return mount;
}

const smooth = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
export function catWakeEyes(elapsed: number, reduced = false) {
  if (elapsed < 0) return 0;
  if (reduced) return elapsed < 3 ? 1 : 0;
  return smooth(elapsed / .16) * (1 - smooth((elapsed - 2.6) / 2));
}
export function catBapWeight(elapsed: number) {
  if (elapsed < 0) return 0;
  return smooth(elapsed / .10) * (1 - smooth((elapsed - .15) / .25));
}


export function catPawReach(target: THREE.Vector3, upper: number, lower: number) {
  // A forward, elbow-led reach. Anatomical limits keep a cursor behind or far
  // above the shoulder from twisting the limb or locking the elbow straight.
  const z = Math.max(.12, target.z);
  const yaw = THREE.MathUtils.clamp(Math.atan2(target.x, z), -.6, .6);
  const y = THREE.MathUtils.clamp(target.y, -.45, .08);
  const forward = Math.hypot(target.x, z);
  const distance = THREE.MathUtils.clamp(Math.hypot(y, forward), (upper + lower) * .48, (upper + lower) * .92);
  const elbow = Math.acos(THREE.MathUtils.clamp(
    (distance * distance - upper * upper - lower * lower) / (2 * upper * lower), -1, 1));
  const shoulder = THREE.MathUtils.clamp(Math.atan2(-forward, -y)
    - Math.atan2(lower * Math.sin(elbow), upper + lower * Math.cos(elbow)), -1.45, .8);
  return { shoulder, elbow, yaw };
}
