import * as THREE from 'three';

export const planterNames = ['Copper & forest', 'Round & rooted', 'Midnight fern'];

// A small, genuinely three-dimensional voxel sculpture, shared by the save icon
// and project gallery. Instances keep the many little cubes cheap to render.
export function voxelPlanter(variant: number, material: (color: number) => THREE.Material) {
  const group = new THREE.Group();
  const cubes = new Map<number, number[][]>();
  const unit = .095;
  const add = (x: number, y: number, z: number, color: number) => {
    if (!cubes.has(color)) cubes.set(color, []);
    cubes.get(color)!.push([x * unit, y * unit, z * unit]);
  };
  const green = 0x315c42, copper = 0xc78343, navy = 0x273e6a, gold = 0xe7b653;
  for (let y = 0; y < 13; y++) {
    const radius = variant === 1 ? 6.1 + Math.sin(y / 12 * Math.PI) * 1.8 : 7;
    for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) {
      const r = Math.hypot(x, z);
      if (r > radius || (y > 0 && r < radius - 1.35)) continue;
      let color = variant === 2 ? navy : green;
      if (variant === 0) color = y < 2 || y === 12 ? copper : (Math.round(Math.atan2(z, x) * 12) % 2 === 0 ? green : 0x487b50);
      if (variant === 1) color = y === 12 ? copper : (x + y + z) % 2 === 0 ? 0x537d49 : 0x42663b;
      // Two stepped gold fern silhouettes wrap around the front of the navy pot.
      if (variant === 2 && z > 2) {
        for (const offset of [-3, 3]) {
          const stem = offset + Math.floor((y - 5) / 4);
          const reach = Math.floor((11 - y) / 3) + 1;
          if (y > 1 && y < 11 && (x === stem || (y % 2 === 0 && Math.abs(x - stem) <= reach))) color = gold;
        }
      }
      add(x, y - 12, z, color);
    }
  }
  if (variant === 1) {
    // A rounded outer cup cut by a sloping plane: the left side embraces
    // the pot higher, with a continuous copper lip descending to the right.
    for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) {
      const rimHeight = Math.floor(-8 - x * .35);
      const r = Math.hypot(x, z);
      for (let y = -14; y <= rimHeight; y++) {
        const radius = Math.sqrt(100 - (y + 5) ** 2);
        if (r > radius || (y > -14 && r < radius - 1.2)) continue;
        add(x, y, z, y === rimHeight ? copper : 0x537d49);
      }
    }
  }
  for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x, z) <= 5.5) add(x, -1, z, 0x49362b);
  const leafColors = [0x538b41, 0x78ab4a, 0x386b39];
  for (let leaf = 0; leaf < 7; leaf++) {
    const angle = leaf * 2.4 + variant * .6;
    const length = variant === 1 ? 8 : 10 + leaf % 3;
    for (let t = 0; t < length; t++) {
      const spread = variant === 1 ? t * .8 : t * .65;
      const x = Math.round(Math.cos(angle) * spread), z = Math.round(Math.sin(angle) * spread);
      const y = variant === 1 ? Math.round(2 + Math.sin(t / length * Math.PI) * 4) : Math.round(1 + t * .8);
      add(x, y, z, 0x416d32);
      const width = t > 2 && t < length - 1 ? (variant === 2 ? (t % 2 === 0 ? 2 : 0) : 2) : 0;
      for (let w = -width; w <= width; w++) add(x + Math.round(Math.cos(angle + Math.PI / 2) * w), y + (w === 0 ? 1 : 0), z + Math.round(Math.sin(angle + Math.PI / 2) * w), leafColors[leaf % 3]);
    }
  }
  const geometry = new THREE.BoxGeometry(unit * .98, unit * .98, unit * .98);
  const matrix = new THREE.Matrix4();
  cubes.forEach((positions, color) => {
    const mesh = new THREE.InstancedMesh(geometry, material(color), positions.length);
    positions.forEach(([x, y, z], i) => mesh.setMatrixAt(i, matrix.makeTranslation(x, y, z)));
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
  group.position.y = .1;
  return group;
}
