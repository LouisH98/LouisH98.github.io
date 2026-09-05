/** Keep the room crisp on Retina displays without increasing the PS2 raster. */
export function renderResolution(width: number, height: number, devicePixelRatio: number) {
  width = Math.max(1, width);
  height = Math.max(1, height);
  const uiScale = Math.min(1, 1440 / width);
  // Cap at 2x and roughly 4K worth of pixels to bound the HDR/depth buffers.
  const roomScale = Math.min(Math.max(1, devicePixelRatio), 2, Math.sqrt(8294400 / (width * height)));
  return {
    uiWidth: Math.max(1, Math.round(width * uiScale)),
    uiHeight: Math.max(1, Math.round(height * uiScale)),
    roomWidth: Math.max(1, Math.round(width * roomScale)),
    roomHeight: Math.max(1, Math.round(height * roomScale)),
  };
}
