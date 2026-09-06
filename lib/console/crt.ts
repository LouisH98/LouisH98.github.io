import { smooth } from './timeline';

export const CRT_POWER_DURATION = 1.15;
/** Open the live raster from a dot to a line, then settle at full size. */
export function crtPowerFrame(seconds: number) {
  return {
    width: .006 + .994 * smooth((seconds - .12) / .3),
    height: .004 + .996 * smooth((seconds - .43) / .4),
    opacity: smooth(seconds / .08),
  };
}

// Follow the tower dive, reaching the viewport before the 12-second menu handoff.
export const CRT_ZOOM_START = 8;
export const CRT_ZOOM_END = 11.7;
export function crtZoom(seconds: number) {
  const t=Math.min(1,Math.max(0,(seconds-CRT_ZOOM_START)/(CRT_ZOOM_END-CRT_ZOOM_START)));
  // Quintic easing starts and finishes with zero velocity and acceleration.
  return t*t*t*(t*(t*6-15)+10);
}

/** Match the direct fullscreen picture before switching away from the room pass. */
export function crtFullscreenBlend(progress: number) {
  return smooth((progress - .9) / .1);
}

/** Animate the aperture itself so the live scene never stretches or swaps canvases. */
export function crtLayout(width: number, height: number, progress: number) {
  const portrait = width <= 700 && height > width;
  const initialWidth = portrait ? Math.max(1, width - 28) : Math.min(1120, width * .88, height * .88 * 1.111);
  const initialHeight = portrait ? Math.max(1, height - 64) : initialWidth / 1.111;
  const p = Math.min(1, Math.max(0, progress));
  const mix = (a: number, b: number) => a + (b - a) * p;
  // The glass occupies 84% of the chassis width and 70% of its height.
  const finalWidth = width / .84, finalHeight = height / .70;
  return {
    left: mix((width - initialWidth) / 2, -finalWidth * .08),
    top: mix((height - initialHeight) / 2, -finalHeight * .095),
    width: mix(initialWidth, finalWidth),
    height: mix(initialHeight, finalHeight),
  };
}
