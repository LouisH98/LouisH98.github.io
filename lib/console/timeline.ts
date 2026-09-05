export const BOOT_DURATION = 12;
export const BOOT_KEY = 'ps2folio:booted';
export const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
// Sampled from the user-selected y9Ln-qyvX_I capture. Height fits the projected
// growth of the tower tops; rotation is clockwise as seen by the overhead camera.
const cameraKeys = [
  [0, 52, .12], [2, 51, .02], [4, 49.5, -.08], [6, 47.5, -.22],
  [7, 44, -.32], [7.5, 39, -.43], [8, 29, -.56], [8.5, 17, -.82], [9.05, 7, -1.03],
] as const;
/** Monotone cubic interpolation avoids stops or jumps at reference keyframes. */
function cameraValue(seconds: number, column: 1 | 2) {
  const last = cameraKeys.length - 1;
  if (seconds <= cameraKeys[0][0]) return cameraKeys[0][column];
  if (seconds >= cameraKeys[last][0]) return cameraKeys[last][column];
  const i = cameraKeys.findIndex((key, index) => index < last && seconds < cameraKeys[index + 1][0]);
  const a = cameraKeys[i], b = cameraKeys[i + 1], duration = b[0] - a[0];
  const slope = (index: number) => (cameraKeys[index + 1][column] - cameraKeys[index][column]) / (cameraKeys[index + 1][0] - cameraKeys[index][0]);
  const tangent = (index: number) => {
    if (index === 0) return slope(0);
    if (index === last) return slope(last - 1);
    const before = slope(index - 1), after = slope(index);
    return before * after <= 0 ? 0 : 2 * before * after / (before + after);
  };
  const t = (seconds - a[0]) / duration, t2 = t * t, t3 = t2 * t;
  return (2*t3-3*t2+1)*a[column] + (t3-2*t2+t)*duration*tangent(i)
    + (-2*t3+3*t2)*b[column] + (t3-t2)*duration*tangent(i+1);
}
export function bootFrame(seconds: number) {
  const height = cameraValue(seconds, 1);
  return {
    title: smooth((seconds - .45) / .45) * (1 - smooth((seconds - 2.5) / .45)),
    height,
    rotation: cameraValue(seconds, 2),
    travel: (52 - height) / 45,
    field: 1 - smooth((seconds - 8.15) / .9),
    // The disc-launch logo in the reference is intentionally replaced by our menu.
    morph: smooth((seconds - 9.05) / (BOOT_DURATION - 9.05)),
    complete: seconds >= BOOT_DURATION,
  };
}
