/** Shared by the physical light and scattering pass; positive X travels toward the bed. */
export const WINDOW_LIGHT = {
  origin: { x: -4.48, y: 1.9, z: -.8 },
  direction: { x: 1, y: -.36, z: -.4 },
  halfSize: { y: 1.14, z: .92 },
};
export function windowLightAtX(x: number) {
  const travel=x-WINDOW_LIGHT.origin.x;
  return { x, y:WINDOW_LIGHT.origin.y+travel*WINDOW_LIGHT.direction.y, z:WINDOW_LIGHT.origin.z+travel*WINDOW_LIGHT.direction.z };
}
