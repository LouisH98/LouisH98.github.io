'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { asset } from '@/lib/console/assets';
// One offscreen WebGL context serves every save; route changes only replace
// their scenes and 2D display canvases, avoiding repeated GPU-context creation.
let sharedRenderer: THREE.WebGLRenderer | undefined;
function saveRenderer() {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({ alpha:true, antialias:false, powerPreference:'low-power' });
    sharedRenderer.setPixelRatio(1); sharedRenderer.setSize(220,200,false);
    sharedRenderer.outputColorSpace=THREE.SRGBColorSpace;
  }
  return sharedRenderer;
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => {
  sharedRenderer?.dispose(); sharedRenderer?.forceContextLoss(); sharedRenderer=undefined;
});
export default function SaveIcon({ kind, active, reduced, image }: { kind: string; active: boolean; reduced: boolean; image: string }) {
  const host = useRef<HTMLDivElement>(null), state = useRef({ active, reduced });
  const [failed, setFailed] = useState(false); state.current = { active, reduced };
  useEffect(() => {
    const el = host.current; if (!el) return;
    const canvas=document.createElement('canvas');canvas.width=220;canvas.height=200;
    const display=canvas.getContext('2d');
    if(!display){setFailed(true);return;}
    try { saveRenderer(); } catch { setFailed(true); return; }
    el.appendChild(canvas);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1.1, .1, 30), group = new THREE.Group();
    camera.position.set(0, 1.1, 5.6); camera.lookAt(0, .15, 0); scene.add(group);
    scene.add(new THREE.AmbientLight(0xf1f1e6, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(-3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xb7c2d0, 2); rim.position.set(3, 2, -3); scene.add(rim);
    const materials = new Map<number, THREE.MeshStandardMaterial>();
    const material = (color: number) => {
      if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .52, metalness: .28, flatShading: true }));
      return materials.get(color)!;
    };
    const block = (w: number, h: number, d: number, x: number, y: number, z: number, color: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color)); m.position.set(x, y, z); group.add(m); return m;
    };
    if (kind === 'print-scheduler') {
      block(1.6, .22, 1.4, 0, -.75, 0, 0x6d79a6);
      [-.68, .68].forEach(x => { [-.5, .5].forEach(z => block(.13, 1.65, .13, x, .12, z, 0xbac3db)); });
      block(1.6, .18, 1.4, 0, .95, 0, 0x8597c6);
      block(1.3, .10, 1.1, 0, -.30, 0, 0x7589ad); block(1.4, .12, .12, 0, .5, .18, 0xced7ec);
      block(.3, .3, .3, .14, .38, .18, 0x404866); block(.42, .45, .42, 0, -.03, 0, 0x82b7d2);
    } else if (kind === 'the-screen') {
      block(1.65, 1.65, .23, 0, 0, 0, 0x263f3c); block(1.48, 1.48, .08, 0, 0, .15, 0x0f1623);
      for (let x=0; x<8; x++) for (let y=0; y<8; y++) {
        const color = (x===1 || (y===3 && x<6) || (x===6 && y>2 && y<6)) ? 0x90e7d1 : ((x+y)%4===0 ? 0x3f8293 : 0x253245);
        block(.125, .125, .035, (x-3.5)*.18, (y-3.5)*.18, .21, color);
      }
    } else {
      block(1.5, .85, 1.1, 0, -.35, 0, 0xb9afbd); block(1.35, .18, 1.05, 0, .16, 0, 0xe7dbe0);
      block(.97, .055, .05, 0, .15, .55, 0x343042);
      const paper = block(.86, 1.15, .035, 0, .68, .32, 0xf4ece1); paper.rotation.x = -.2;
      const heart = ['0110110','1111111','1111111','0111110','0011100','0001000'];
      heart.forEach((row,y)=>row.split('').forEach((cell,x)=>{ if(cell==='1') block(.075,.075,.018,(x-3)*.079, .99-y*.079, .42-(.99-y*.079-.68)*.2, 0xc7779d); }));
      block(.09, .035, .07, .51, .27, .36, 0x8ed1ac);
    }
    group.rotation.set(.05, -.4, 0);
    let frame=0, time=0, prev=0;
    const tick=(now:number)=>{
      frame=requestAnimationFrame(tick); const dt=Math.min((now-prev)/1000,.05);prev=now;
      if(document.hidden) return;
      if(!state.current.reduced && state.current.active) time+=dt;
      group.rotation.y=-.4 + Math.sin(time*.65)*.5; group.position.y=Math.sin(time*1.2)*.055;
      try {
        const renderer=saveRenderer();
        if(renderer.getContext().isContextLost()){setFailed(true);cancelAnimationFrame(frame);return;}
        renderer.render(scene,camera);display.clearRect(0,0,220,200);display.drawImage(renderer.domElement,0,0);
      } catch { setFailed(true);cancelAnimationFrame(frame); }
    };
    frame=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(frame);group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());canvas.remove();};
  }, [kind]);
  return <div className="save-icon" ref={host} aria-hidden="true">{failed && <img src={asset(image.replace(/\.mp4$/, '.png'))} alt="" />}</div>;
}
