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
    // LovePrint gets a screen-sized transparent layer so detached sheets can leave
    // the icon's scroll/clipping box without changing the grid or its hit targets.
    const browser=el.closest<HTMLElement>('.save-browser');
    let paperRenderer:THREE.WebGLRenderer|undefined;
    let layoutObserver:ResizeObserver|undefined;
    const layout=()=>{
      if(!paperRenderer||!browser)return;
      const icon=el.getBoundingClientRect(),bounds=browser.getBoundingClientRect();
      const scale=Math.min(icon.width/220,icon.height/200);
      if(scale<=0)return;
      const left=icon.left-bounds.left+(icon.width-220*scale)/2;
      const top=icon.top-bounds.top+(icon.height-200*scale)/2;
      camera.setViewOffset(220,200,-left/scale,-top/scale,bounds.width/scale,bounds.height/scale);
      const resolution=Math.min(1,960/bounds.width);
      paperRenderer.setSize(Math.round(bounds.width*resolution),Math.round(bounds.height*resolution),false);
    };
    if(kind==='loveprint'&&browser){
      try{
        paperRenderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
        paperRenderer.setPixelRatio(1);paperRenderer.outputColorSpace=THREE.SRGBColorSpace;
        paperRenderer.domElement.className='receipt-scene';paperRenderer.domElement.setAttribute('aria-hidden','true');
        browser.appendChild(paperRenderer.domElement);canvas.style.visibility='hidden';
        layoutObserver=new ResizeObserver(layout);layoutObserver.observe(el);layoutObserver.observe(browser);
        browser.addEventListener('scroll',layout,true);layout();
      }catch{paperRenderer=undefined;}
    }
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
    let animateModel=(time:number)=>{void time;};
    const textures:THREE.Texture[]=[];
    const extraMaterials:THREE.Material[]=[];
    if (kind === 'print-scheduler') {
      block(1.6, .22, 1.4, 0, -.75, 0, 0x6d79a6);
      [-.68, .68].forEach(x => { [-.5, .5].forEach(z => block(.13, 1.65, .13, x, .12, z, 0xbac3db)); });
      block(1.6, .18, 1.4, 0, .95, 0, 0x8597c6);
      block(1.3, .10, 1.1, 0, -.30, 0, 0x7589ad);
      const rail=block(1.4,.08,.08,0,.5,0,0xced7ec);
      const head=block(.25,.22,.23,0,.38,0,0x404866);
      const nozzle=block(.07,.10,.07,0,.23,0,0xe4bb73);
      const layers=Array.from({length:24},(_,i)=>{
        const r=.19+.035*Math.sin(i/23*Math.PI*2);
        const layer=new THREE.Mesh(new THREE.TorusGeometry(r,.018,4,20),material(0x82b7d2));
        layer.rotation.x=Math.PI/2;layer.position.y=-.23+i*.024;group.add(layer);return layer;
      });
      animateModel=time=>{
        const progress=Math.min((time%9)/7.5,1),height=progress*23;
        layers.forEach((layer,i)=>{layer.visible=i<=height;});
        const angle=time*7.5,r=.19+.035*Math.sin(progress*Math.PI*2);
        head.position.set(Math.cos(angle)*r,-.23+height*.024+.20,Math.sin(angle)*r);
        nozzle.position.copy(head.position);nozzle.position.y-=.16;
        rail.position.set(0,head.position.y+.07,head.position.z);
      };
    } else if (kind === 'the-screen') {
      block(1.65, 1.65, .23, 0, 0, 0, 0x263f3c); block(1.48, 1.48, .08, 0, 0, .15, 0x0f1623);
      const pixels:THREE.Mesh[]=[];
      for(let y=0;y<8;y++)for(let x=0;x<8;x++)pixels.push(block(.125,.125,.035,(x-3.5)*.18,(3.5-y)*.18,.21,0x253245));
      const alive=new THREE.MeshStandardMaterial({color:0x90e7d1,emissive:0x53cda8,emissiveIntensity:1,roughness:.6});extraMaterials.push(alive);
      const seed=()=>Array.from({length:64},(_,i)=>[[1,0],[2,1],[0,2],[1,2],[2,2],[4,5],[5,5],[6,5]].some(([x,y])=>i===y*8+x)?1:0);
      let cells=seed(),generation=-1;
      animateModel=time=>{
        const nextGeneration=Math.floor(time/.32);
        if(nextGeneration===generation)return;
        if(generation>=0){
          const next=cells.map((cell,i)=>{
            const x=i%8,y=Math.floor(i/8);let neighbors=0;
            for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)neighbors+=cells[((y+dy+8)%8)*8+(x+dx+8)%8];
            return neighbors===3||(cell===1&&neighbors===2)?1:0;
          });
          cells=nextGeneration%48===0||next.every((cell,i)=>cell===cells[i])?seed():next;
        }
        generation=nextGeneration;pixels.forEach((pixel,i)=>{pixel.material=cells[i]?alive:material(0x253245);});
      };
    } else {
      block(1.5, .85, 1.1, 0, -.35, 0, 0xb9afbd); block(1.35, .18, 1.05, 0, .16, 0, 0xe7dbe0);
      block(.97, .055, .05, 0, .15, .55, 0x343042);
      const drawings=[['0110110','1111111','1111111','0111110','0011100','0001000'],['1000001','1100011','1111111','1011101','1111111','0111110','0011100'],['0011100','0101010','1101011','0111110','0010100','0001000','0101000','0011000']];
      const receipts=drawings.map(drawing=>{
        const art=document.createElement('canvas');art.width=96;art.height=144;const ctx=art.getContext('2d')!;
        ctx.fillStyle='#f4ece1';ctx.fillRect(0,0,96,144);ctx.fillStyle='#774657';
        drawing.forEach((row,y)=>row.split('').forEach((cell,x)=>{if(cell==='1')ctx.fillRect(20+x*8,25+y*8,8,8);}));
        ctx.fillStyle='#92848a';for(let y=112;y<130;y+=6)ctx.fillRect(19,y,y===124?35:58,2);
        const texture=new THREE.CanvasTexture(art);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;textures.push(texture);
        const ink=new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0,side:THREE.DoubleSide});extraMaterials.push(ink);
        const paper=new THREE.Mesh(new THREE.PlaneGeometry(.86,1.15,1,10),ink);group.add(paper);return {paper,texture,detached:false,origin:new THREE.Vector3(),rotation:new THREE.Quaternion()};
      });
      animateModel=time=>{
        receipts.forEach((receipt,i)=>{
          const {paper,texture}=receipt;
          const age=time-i*4;
          paper.visible=age>=0;if(!paper.visible)return;
          const phase=age%12;
          const feedTime=Math.min((phase+.25)/2.8,1);
          const feed=feedTime*feedTime*(3-2*feedTime);
          if(phase<3){
            if(receipt.detached){group.add(paper);receipt.detached=false;}
            texture.repeat.y=feed;texture.offset.y=1-feed;
            paper.scale.y=feed;paper.position.set(0,.18+1.15*feed/2,.59);paper.rotation.set(-.08,0,0);
            const vertices=paper.geometry.attributes.position;
            for(let v=0;v<vertices.count;v++)vertices.setZ(v,0);
            vertices.needsUpdate=true;
          }else{
            if(!receipt.detached){
              paper.scale.y=1;texture.repeat.y=1;texture.offset.y=0;
              paper.position.set(0,.18+1.15/2,.59);paper.rotation.set(-.08,0,0);
              group.updateMatrixWorld(true);scene.attach(paper);
              receipt.origin.copy(paper.position);receipt.rotation.copy(paper.quaternion);receipt.detached=true;
            }
            const fall=phase-3,release=1-Math.exp(-fall*fall*3);
            // Gravity with air drag: starts at rest and approaches a terminal speed.
            const drop=5.5*(fall-.8*(1-Math.exp(-fall/.8)));
            paper.position.copy(receipt.origin);
            paper.position.y-=drop;
            paper.position.x+=(Math.sin(fall*2.4+i)-Math.sin(i))*.32*release;
            paper.position.z+=.8*release;
            paper.quaternion.copy(receipt.rotation);
            paper.rotateX((Math.sin(fall*3)*.35+fall*.3)*release);
            paper.rotateZ(Math.sin(fall*2.4+i)*.26*release);
            const vertices=paper.geometry.attributes.position;
            for(let v=0;v<vertices.count;v++)vertices.setZ(v,Math.sin(vertices.getY(v)*5+fall*7)*.055*release);
            vertices.needsUpdate=true;paper.geometry.computeVertexNormals();
          }
        });
      };
      block(.09, .035, .07, .51, .27, .36, 0x8ed1ac);
    }
    group.rotation.set(.05, -.4, 0);
    let frame=0, time=0, modelTime=state.current.reduced?2.5:0, prev=0;
    const tick=(now:number)=>{
      frame=requestAnimationFrame(tick); const dt=Math.min((now-prev)/1000,.05);prev=now;
      if(document.hidden) return;
      if(!state.current.reduced && state.current.active) time+=dt;
      if(!state.current.reduced)modelTime+=dt;
      animateModel(modelTime);
      group.rotation.y=-.4 + Math.sin(time*.65)*.5; group.position.y=Math.sin(time*1.2)*.055;
      try {
        const renderer=saveRenderer();
        if(renderer.getContext().isContextLost()){setFailed(true);cancelAnimationFrame(frame);return;}
        if(paperRenderer)paperRenderer.render(scene,camera);
        else {renderer.render(scene,camera);display.clearRect(0,0,220,200);display.drawImage(renderer.domElement,0,0);}
      } catch { setFailed(true);cancelAnimationFrame(frame); }
    };
    frame=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(frame);layoutObserver?.disconnect();browser?.removeEventListener('scroll',layout,true);paperRenderer?.dispose();paperRenderer?.forceContextLoss();paperRenderer?.domElement.remove();scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());extraMaterials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());canvas.remove();};
  }, [kind]);
  return <div className="save-icon" ref={host} aria-hidden="true">{failed && <img src={asset(image.replace(/\.mp4$/, '.png'))} alt="" />}</div>;
}
