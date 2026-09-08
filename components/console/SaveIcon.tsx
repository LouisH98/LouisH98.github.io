'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { asset } from '@/lib/console/assets';
import { voxelPlanter } from './voxelPlanter';
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
export default function SaveIcon({ kind, active, reduced, image, variant }: { kind: string; active: boolean; reduced: boolean; image: string; variant?: number }) {
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
    let disposed=false;
    if (kind === 'arm' || kind === 'cambridge-intelligence') {
      const isArm=kind==='arm';
      block(2.35, 1.25, .16, 0, 0, 0, isArm ? 0x080225 : 0xdce2e8);
      const logoMaterial=new THREE.MeshBasicMaterial({transparent:true});extraMaterials.push(logoMaterial);
      const logo=new THREE.Mesh(new THREE.PlaneGeometry(1.9,isArm ? .58 : .55),logoMaterial);
      logo.position.z=.085;group.add(logo);
      new THREE.TextureLoader().load(asset(image),texture=>{
        if(disposed){texture.dispose();return;}
        texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
        textures.push(texture);logoMaterial.map=texture;logoMaterial.needsUpdate=true;
      },undefined,()=>{if(!disposed)setFailed(true);});
    } else if (kind === 'labs-creations') {
      const pots = [0, 1, 2].map(index => { const pot = voxelPlanter(index, material); group.add(pot); return pot; });
      animateModel = time => {
        const cycle = time / 5, current = variant ?? Math.floor(cycle) % 3;
        const transition = variant !== undefined || state.current.reduced ? 0 : Math.max(0, (cycle % 1 - .8) / .2);
        const ease = transition * transition * (3 - 2 * transition);
        pots.forEach((pot, index) => {
          pot.visible = index === current || (transition > 0 && index === (current + 1) % 3);
          pot.position.x = index === current ? -ease * 4 : (1 - ease) * 4;
        });
      };
    } else if (kind === 'print-scheduler') {
      // An open-front gantry keeps the print readable at save-icon size.
      block(1.85, .30, 1.4, 0, -.85, 0, 0x465477);
      [-.78, .78].forEach(x => block(.23, 1.8, .28, x, .15, -.25, 0xaab9d4));
      block(1.95, .25, .42, 0, 1.08, -.25, 0x657ba5);
      block(.42, .16, .055, .53, -.82, .72, 0x76e6ce);
      const bed=block(1.4, .14, 1.05, 0, -.60, 0, 0x8498bb);
      const surface=block(1.25, .035, .92, 0, -.512, 0, 0x28394f);
      const rail=block(1.5,.14,.16,0,.5,-.25,0xd2dded);
      const head=block(.40,.34,.37,0,.38,0,0xefad60);
      const fan=block(.22,.19,.035,0,.38,.20,0x35415a);
      const nozzle=block(.09,.13,.09,0,.145,0,0xffdb91);
      const radius=(progress:number)=>.22+.15*Math.sin(progress*Math.PI)-.085*Math.exp(-Math.pow((progress-.82)/.16,2));
      const layers=Array.from({length:28},(_,i)=>{
        const layer=new THREE.Mesh(new THREE.TorusGeometry(radius(i/27),.023,4,16),material(0x58dbbc));
        layer.rotation.x=Math.PI/2;layer.position.y=-.47+i*.033;group.add(layer);return layer;
      });
      const prints=[new THREE.Group(),new THREE.Group(),new THREE.Group()];
      prints.forEach(print=>group.add(print));
      layers.forEach(layer=>prints[0].add(layer));
      // Top-to-bottom silhouettes are sliced into the same 28 print layers.
      const patterns=[
        ['000010000','000111000','001111100','001212100','001111100','011111110','011111110','001111100','001101100','011101110'],
        ['001000100','001101100','001111100','001212100','001131100','000111000','000111001','001111001','001111011','001111110'],
      ];
      patterns.forEach((pattern,index)=>{
        for(let i=0;i<28;i++){
          const row=pattern[9-Math.floor(i/28*10)];
          Array.from(row).forEach((cell,x)=>{
            if(cell==='0')return;
            const color=cell==='2'?0x263449:cell==='3'?0xf29cae:index===0?0x8fb9f5:0xf3b76e;
            const voxel=new THREE.Mesh(new THREE.BoxGeometry(.085,.033,.28),material(color));
            voxel.position.set((x-4)*.085,-.47+i*.033,0);
            voxel.userData.layer=i;prints[index+1].add(voxel);
          });
        }
      });
      const ease=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
      animateModel=time=>{
        const phase=time%12,current=Math.floor(time/12)%3,progress=Math.min(phase/7,1),height=progress*27;
        const present=.52*ease((phase-8)/.8)*(1-ease((phase-11)/.8));
        const exit=ease((phase-10)/1);
        const angle=time*9,r=radius(progress),park=ease((phase-7)/.7);
        const scanX=current===0?Math.cos(angle)*r:Math.sin(angle)*.30;
        const scanZ=current===0?Math.sin(angle)*r:Math.sin(angle*2)*.12;
        // The bed supplies depth travel in the opposite direction to the toolpath.
        const bedZ=present-scanZ*(1-park);
        bed.position.z=surface.position.z=bedZ;
        prints.forEach((print,index)=>{
          print.visible=index===current&&phase<11;
          print.position.set(exit*2.8,-exit*exit*.65,bedZ+exit*.6);
          print.rotation.z=-exit*.35;
          print.scale.setScalar(1-exit*.35);
          print.children.forEach((part,i)=>{part.visible=(index===0?i:part.userData.layer)<=height;});
        });
        const x=scanX*(1-park)+.57*park;
        const z=0;
        const y=-.47+height*.033+.30+.18*park;
        head.position.set(x,y,z);
        fan.position.set(x,y,z+.20);
        nozzle.position.set(x,y-.235,z);
        rail.position.set(0,y+.08,-.25);
      };
    } else if (kind === 'the-screen') {
      block(1.65, 1.65, .23, 0, 0, 0, 0x263f3c); block(1.48, 1.48, .08, 0, 0, .15, 0x0f1623);
      const pixels:THREE.Mesh[]=[];
      for(let y=0;y<8;y++)for(let x=0;x<8;x++)pixels.push(block(.125,.125,.035,(x-3.5)*.18,(3.5-y)*.18,.21,0x253245));
      const alive=new THREE.MeshStandardMaterial({color:0x90e7d1,emissive:0x53cda8,emissiveIntensity:1,roughness:.6});extraMaterials.push(alive);
      const led=(color:number,intensity=1)=>{
        const m=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.6});
        extraMaterials.push(m);return m;
      };
      const off=material(0x253245),paddle=led(0x328aff),ball=led(0xff55cb),net=led(0x174a88,.4);
      const rain=[led(0xbaffff),led(0x28dfbe),led(0x139d80,.7),led(0x0b594d,.4)];
      const seed=()=>Array.from({length:64},()=>Math.random()<.32?1:0);
      const pongOffset={x:Math.random()*10,y:Math.random()*14};
      const streams=Array.from({length:8},()=>({speed:2.5+Math.random()*3,offset:Math.random()*13}));
      let cells=seed(),generation=-1,lastMode=-1,lastFrame=-1;
      animateModel=time=>{
        // Eight seconds per slide, with the same frozen preview in reduced motion.
        const mode=Math.floor(time/8)%3,local=time%8,frame=Math.floor(local*18);
        if(mode!==lastMode){cells=seed();generation=-1;lastFrame=-1;lastMode=mode;}
        if(mode!==0){
          if(frame===lastFrame)return;
          lastFrame=frame;pixels.forEach(pixel=>{pixel.material=off;});
          const paint=(x:number,y:number,m:THREE.Material)=>{if(x>=0&&x<8&&y>=0&&y<8)pixels[y*8+x].material=m;};
          if(mode===1){
            for(let y=0;y<8;y+=2)paint(3,y,net);
            // A reflected trajectory keeps the self-playing rally continuous.
            const bounce=(value:number,span:number)=>span-Math.abs(value%(span*2)-span);
            const x=1+bounce(pongOffset.x+local*3,5),y=bounce(pongOffset.y+local*2.2,7);
            const left=Math.max(1,Math.min(6,Math.round(y+Math.sin(local*2)*.8)));
            const right=Math.max(1,Math.min(6,Math.round(y+Math.cos(local*2)*.8)));
            for(let dy=-1;dy<=1;dy++){paint(0,left+dy,paddle);paint(7,right+dy,paddle);}
            paint(Math.round(x),Math.round(y),ball);
          }else{
            for(let x=0;x<8;x++){
              const head=Math.floor(local*streams[x].speed+streams[x].offset)%13;
              rain.forEach((m,tail)=>paint(x,head-tail,m));
            }
          }
          return;
        }
        const nextGeneration=Math.floor(local/(.32/1.5));
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
      block(1.5, .85, 1.1, 0, -.35, 0, 0x303238); block(1.35, .18, 1.05, 0, .16, 0, 0x484b52);
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
    return ()=>{disposed=true;cancelAnimationFrame(frame);layoutObserver?.disconnect();browser?.removeEventListener('scroll',layout,true);paperRenderer?.dispose();paperRenderer?.forceContextLoss();paperRenderer?.domElement.remove();scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());extraMaterials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());canvas.remove();};
  }, [kind, variant, image]);
  return <div className="save-icon" ref={host} aria-hidden="true">{failed && <img src={asset(image.replace(/\.mp4$/, '.png'))} alt="" />}</div>;
}
