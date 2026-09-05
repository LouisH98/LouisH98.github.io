'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { bootFrame, smooth } from '@/lib/console/timeline';
type Props = { boot: boolean; elapsed: number; reduced: boolean; view: string; onFailure: () => void };
export default function Scene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef(props); state.current = props;
  useEffect(() => {
    const container = host.current; if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' }); }
    catch { state.current.onFailure(); return; }
    renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0); renderer.autoClear = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace; container.appendChild(renderer.domElement);
    const world = new THREE.Scene(), overlay = new THREE.Scene();
    world.fog = new THREE.FogExp2(0x111119, .019);
    const camera = new THREE.PerspectiveCamera(48, 1, .1, 160);
    camera.up.set(0, 0, -1);
    const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 20); screenCamera.position.z = 10;
    const field = new THREE.Group(); world.add(field);
    const fadeScene=new THREE.Scene();
    const fadePlane=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,depthTest:false,depthWrite:false}));
    fadeScene.add(fadePlane);
    let seed = 12;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const box = new THREE.BoxGeometry(1, 1, 1);
    const materials = [0x343644, 0x242630, 0x8b91a6, 0x20222b, 0x4b5064, 0x30323e].map(color => new THREE.MeshBasicMaterial({ color }));
    // Regular square tops with varied depth: the camera begins almost normal to the grid.
    for (let row = -5; row <= 5; row++) for (let col = -7; col <= 7; col++) {
      if (random() < .43 || (Math.abs(col) < 2 && Math.abs(row) < 2)) continue;
      const height = 2 + random() * 10;
      const tower = new THREE.Mesh(box, materials);
      tower.scale.set(2.05, height, 2.05); tower.position.set(col * 2.65, height / 2, row * 2.65); field.add(tower);
    }
    // Low central saves remain in frame during the dive, as in the reference.
    // Leave only the center cell open instead of an artificial broad empty shaft.
    for (const [col,row] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
      const height=2.5+random()*2.5;
      const tower=new THREE.Mesh(box,materials);
      tower.scale.set(2.05,height,2.05);tower.position.set(col*2.65,height/2,row*2.65);field.add(tower);
    }
    for (const [x,z] of [[-12,-8],[12,-8],[-12,8]]) {
      const cluster = new THREE.Group(); cluster.position.set(x, 7, z); cluster.rotation.set(.18,.52,.2);
      for (let i=0;i<5;i++) { const cube=new THREE.Mesh(box,materials); cube.scale.setScalar(2.4); cube.position.set((i%2)*2,Math.floor(i/2)*1.7,(i%3)*1.3); cluster.add(cube); }
      field.add(cluster);
    }
    const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
    const ctx = glowCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.12,'rgba(255,255,255,1)');
    gradient.addColorStop(.28,'rgba(255,255,255,.65)'); gradient.addColorStop(.55,'rgba(255,255,255,.13)'); gradient.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gradient; ctx.fillRect(0,0,64,64);
    const texture = new THREE.CanvasTexture(glowCanvas);
    const colors=[0x48a6ff,0xff7655,0x63e691,0xeacb6a];
    const sprites=Array.from({length:8},(_,i)=>{
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:colors[i%4],blending:THREE.AdditiveBlending,depthWrite:false})); overlay.add(sprite); return sprite;
    });
    const cores=sprites.map(()=>{
      const core=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xe6fbff,blending:THREE.AdditiveBlending,depthWrite:false}));overlay.add(core);return core;
    });
    type Sample = { time:number; x:number; y:number; size:number; opacity:number; color:THREE.Color };
    const histories: Sample[][] = sprites.map(()=>[]);
    let wasBoot=state.current.boot;
    const haze = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0x304fbb,opacity:.24,blending:THREE.AdditiveBlending,depthWrite:false}));
    haze.scale.set(1.8,1.1,1); overlay.add(haze);
    const cloudCanvas=document.createElement('canvas'); cloudCanvas.width=cloudCanvas.height=128;
    const cloudContext=cloudCanvas.getContext('2d')!;
    for(let i=0;i<90;i++){
      const x=random()*128,y=random()*128,r=8+random()*23;
      const g=cloudContext.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(95,112,210,.16)');g.addColorStop(1,'rgba(10,20,80,0)');
      cloudContext.fillStyle=g;cloudContext.fillRect(0,0,128,128);
    }
    // Feather the entire cloud tile; rotating sprites must never expose square edges.
    cloudContext.globalCompositeOperation='destination-in';
    const cloudMask=cloudContext.createRadialGradient(64,64,16,64,64,64);
    cloudMask.addColorStop(0,'rgba(255,255,255,1)');cloudMask.addColorStop(1,'rgba(255,255,255,0)');
    cloudContext.fillStyle=cloudMask;cloudContext.fillRect(0,0,128,128);
    const cloudTexture=new THREE.CanvasTexture(cloudCanvas);
    const clouds=Array.from({length:3},(_,i)=>{
      const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTexture,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}));
      cloud.scale.set(1.6+i*.35,.85+i*.25,1);overlay.add(cloud);return cloud;
    });
    const trailMaterials: THREE.SpriteMaterial[]=[];
    const trails=sprites.map(()=>Array.from({length:12},()=>{
      const mat=new THREE.SpriteMaterial({map:texture,blending:THREE.AdditiveBlending,depthWrite:false}); trailMaterials.push(mat);
      const sprite=new THREE.Sprite(mat); overlay.add(sprite); return sprite;
    }));
    let width=1,height=1,portrait=false;
    const resize=()=>{
      width=container.clientWidth; height=container.clientHeight; portrait=width/height<.85;
      const resolution=Math.min(1,(width<650?480:720)/width);
      renderer.setSize(Math.round(width*resolution),Math.round(height*resolution),false);
      camera.aspect=width/height; camera.updateProjectionMatrix();
      fadePlane.scale.x=camera.aspect;
      screenCamera.left=-camera.aspect; screenCamera.right=camera.aspect; screenCamera.updateProjectionMatrix();
    };
    const observer=new ResizeObserver(resize); observer.observe(container); resize();
    let frame=0,time=0,previous=0,initialized=false;
    let backgroundAlpha=state.current.boot?1:0;
    const center=new THREE.Vector2(), target=new THREE.Vector2(); let radius=.28;
    const blue=new THREE.Color(0x398fff);
    const orbit=(i:number,t:number)=>new THREE.Vector2(Math.sin(t*1.13+i*1.57)*(.16+t*.018),Math.cos(t*.87+i*1.57)*.13+Math.sin(t*1.7+i)*.055);
    const animate=(now:number)=>{
      frame=requestAnimationFrame(animate);
      const dt=Math.min((now-previous)/1000,.05); previous=now; if(document.hidden)return;
      const p=state.current;
      if(p.reduced||(p.boot&&!wasBoot))histories.forEach(h=>{h.length=0;});
      wasBoot=p.boot;
      if(!p.reduced)time+=dt;
      const phase=bootFrame(p.elapsed), morph=p.boot?phase.morph:1;
      const menu=p.boot||p.view==='menu';
      target.set(menu?(portrait?0:-camera.aspect*.41):0,menu?(portrait?.38:.02):0);
      const targetRadius=menu?(portrait?.245:.31):(portrait?.42:.48);
      const blend=p.reduced||!initialized?1:1-Math.exp(-dt*4.5);
      center.lerp(target,blend); radius=THREE.MathUtils.lerp(radius,targetRadius,blend); initialized=true;
      // Black belongs to the tower pass, so it never covers the orb/trail overlay.
      backgroundAlpha=p.boot?1:THREE.MathUtils.lerp(backgroundAlpha,0,blend);
      renderer.setClearColor(0x000000,backgroundAlpha);
      renderer.clear();
      if(p.boot&&phase.field>0){
        camera.position.set(0,phase.height,.001); camera.lookAt(0,0,0);
        // Negative world-Y rotation reads clockwise through the overhead camera.
        field.rotation.y=phase.rotation; renderer.render(world,camera);
        fadePlane.material.opacity=1-phase.field;
        renderer.render(fadeScene,screenCamera);
      }
      haze.material.opacity=p.boot?.25*phase.field:.045;
      clouds.forEach((cloud,i)=>{cloud.material.opacity=p.boot?.32*phase.field:0;cloud.material.rotation=time*.018*(i%2?1:-1);cloud.position.set(Math.sin(time*.15+i)*.13,Math.cos(time*.13+i)*.07,0);});
      for(let i=0;i<8;i++){
        const theta=i/8*Math.PI*2+time*.55+Math.sin(time*.61+i*.9)*.17;
        const r=radius*(1+Math.sin(time*.34)*.12+Math.sin(time*.47+i*1.3)*.075);
        const tilt=.45+Math.sin(time*.37)*.95, roll=Math.sin(time*.23)*.5+time*.06;
        const x=Math.cos(theta)*r, y=Math.sin(theta)*r*Math.cos(tilt), depth=Math.sin(theta)*Math.sin(tilt);
        const ring=new THREE.Vector2(center.x+x*Math.cos(roll)-y*Math.sin(roll),center.y+x*Math.sin(roll)+y*Math.cos(roll));
        const start=orbit(i%4,p.elapsed);
        const sprite=sprites[i]; sprite.position.set(THREE.MathUtils.lerp(start.x,ring.x,morph),THREE.MathUtils.lerp(start.y,ring.y,morph),0);
        sprite.material.color.setHex(colors[i%4]).lerp(blue,morph);
        sprite.material.opacity=(i<4?1:smooth(morph*1.6))*(1+depth*.18*morph);
        const size=THREE.MathUtils.lerp(.058,radius*(.46+depth*.09),morph);
        sprite.scale.setScalar(size);
        const core=cores[i];core.position.copy(sprite.position);core.scale.setScalar(size*.32);
        core.material.opacity=sprite.material.opacity*(.3+morph*.6);
        // Trails sample actual displayed positions, including morph and route interpolation.
        // Time-based sampling keeps the same tail length on 60/120/144 Hz displays.
        const history=histories[i];
        if(!p.reduced)history.push({time,x:sprite.position.x,y:sprite.position.y,size,opacity:sprite.material.opacity,color:sprite.material.color.clone()});
        while(history.length>2&&history[1].time<time-.85)history.shift();
        trails[i].forEach((trail,j)=>{
          const sampleTime=time-(j+1)*THREE.MathUtils.lerp(.035,.05,morph);
          let index=history.findIndex(sample=>sample.time>=sampleTime);
          if(index<0)index=history.length-1;
          const after=history[index],before=history[Math.max(0,index-1)];
          if(!after||!before||p.reduced){trail.material.opacity=0;return;}
          const mix=after.time===before.time?0:THREE.MathUtils.clamp((sampleTime-before.time)/(after.time-before.time),0,1);
          trail.position.set(THREE.MathUtils.lerp(before.x,after.x,mix),THREE.MathUtils.lerp(before.y,after.y,mix),0);
          trail.material.color.copy(before.color).lerp(after.color,mix);
          trail.material.opacity=THREE.MathUtils.lerp(before.opacity,after.opacity,mix)*(.24-j*.018)*(j<7?1:morph);
          trail.scale.setScalar(THREE.MathUtils.lerp(before.size,after.size,mix)*(.65-j*.035));
        });
      }
      renderer.clearDepth(); renderer.render(overlay,screenCamera);
    };
    frame=requestAnimationFrame(animate);
    const lost=(event:Event)=>{event.preventDefault();state.current.onFailure();}; renderer.domElement.addEventListener('webglcontextlost',lost);
    return()=>{
      cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);
      fadePlane.geometry.dispose();fadePlane.material.dispose();
      box.dispose();materials.forEach(m=>m.dispose());sprites.forEach(s=>s.material.dispose());cores.forEach(s=>s.material.dispose());trailMaterials.forEach(m=>m.dispose());haze.material.dispose();clouds.forEach(c=>c.material.dispose());cloudTexture.dispose();texture.dispose();renderer.dispose();renderer.domElement.remove();
    };
  }, []);
  return <div className="scene" ref={host} aria-hidden="true" />;
}
