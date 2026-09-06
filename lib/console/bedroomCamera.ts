import { smooth } from './timeline';

export function bedroomCameraFrame(width: number, height: number, progress: number, returning = false) {
  const p=Math.min(1,Math.max(0,progress));
  const portrait=width<700&&height>width;
  const initial={x:0,y:.11,z:portrait?11.7:8.1};
  const distance=Math.min(1.125,1.5/(width/height))/Math.tan(Math.PI/9)*.92;
  const focusedZ=.72+distance;
  // Frame the TV closely while including the PS2 at the front of the desk.
  const roomZ=5.3;
  const returnBlend=Math.min(1,Math.max(0,(p-.62)/.38));
  return {
    x:0,
    y:returning?-.16+(.11+.16)*returnBlend:.11,
    z:returning?roomZ+(focusedZ-roomZ)*returnBlend:initial.z+(focusedZ-initial.z)*p,
    handoff:smooth((p-.82)/.18),
  };
}
