import { smooth } from './timeline';

export function bedroomCameraFrame(width: number, height: number, progress: number) {
  const p=Math.min(1,Math.max(0,progress));
  const portrait=width<700&&height>width;
  const initial={x:0,y:.11,z:portrait?11.7:8.1};
  const distance=Math.min(1.125,1.5/(width/height))/Math.tan(Math.PI/9)*.92;
  return {
    x:0,
    y:.11,
    z:initial.z+(.72+distance-initial.z)*p,
    handoff:smooth((p-.82)/.18),
  };
}
