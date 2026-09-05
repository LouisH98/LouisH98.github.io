import * as THREE from 'three';
import { LAYOUT_DEFAULTS } from '@/lib/console/layout';

export type LayoutItem={name:string;objects:THREE.Object3D[];wall?:boolean};
const storageKey='ps2folio:dev-layout:v1';

export function createLayoutEditor(renderer:THREE.WebGLRenderer,room:THREE.Scene,camera:THREE.Camera,items:LayoutItem[],invalidate:()=>void,finish:()=>void){
  const panel=document.createElement('aside');panel.className='layout-dev';panel.dataset.devControls='';panel.setAttribute('aria-label','Room layout development controls');
  panel.innerHTML='<label><input type="checkbox"> Arrange room</label><p>Drag props along their surface. Poster moves along the wall. Select an item and use arrow keys for fine adjustments; Shift moves faster. Layout saves in this browser.</p><select aria-label="Select room item"><option value="">Select an item</option></select><output aria-live="polite"></output><div><button type="button">Copy layout</button><button type="button">Reset layout</button></div><textarea aria-label="Room layout JSON" readonly hidden></textarea>';
  document.body.append(panel);
  const toggle=panel.querySelector('input')!,select=panel.querySelector('select')!,status=panel.querySelector('output')!,text=panel.querySelector('textarea')!;
  const overlay=document.createElement('div');overlay.className='layout-dev-surface';overlay.style.display='none';overlay.setAttribute('aria-label','Drag room props');document.body.append(overlay);
  const defaults=items.map(item=>new THREE.Vector3(...(LAYOUT_DEFAULTS[item.name]??[0,0,0])));
  // Saved values are absolute authored offsets, not additional shifts from today's defaults.
  const bases=items.map((item,i)=>item.objects.map(object=>object.position.clone().sub(defaults[i])));
  const offsets=defaults.map(value=>value.clone());
  items.forEach((item,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=item.name;select.append(option);});
  const owners=new Map<THREE.Object3D,number>();
  items.forEach((item,i)=>item.objects.forEach(root=>root.traverse(object=>{if(object instanceof THREE.Mesh){owners.set(object,i);}})));
  const highlight=new THREE.Box3Helper(new THREE.Box3(),0xffbd75);highlight.visible=false;(highlight.material as THREE.LineBasicMaterial).depthTest=false;highlight.renderOrder=100;room.add(highlight);
  let selected=-1,active=false,available=false,pointer:number|null=null;
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(),start=new THREE.Vector3(),point=new THREE.Vector3(),initial=new THREE.Vector3();
  function selection(i:number){selected=i;select.value=i<0?'':String(i);updateHighlight();}
  function updateHighlight(){highlight.visible=active&&available&&selected>=0;if(highlight.visible){highlight.box.makeEmpty();items[selected].objects.forEach(o=>highlight.box.expandByObject(o));status.textContent=items[selected].name;}}
  function apply(i:number){items[i].objects.forEach((object,j)=>object.position.copy(bases[i][j]).add(offsets[i]));room.updateMatrixWorld(true);updateHighlight();renderer.shadowMap.needsUpdate=true;invalidate();}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(data()));}catch{status.textContent='Storage unavailable; use Copy layout.';}}
  function data(){return Object.fromEntries(items.map((item,i)=>[item.name,offsets[i].toArray().map(n=>Math.round(n*1000)/1000)]));}
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');items.forEach((item,i)=>{const v=saved?.[item.name];if(Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=20)){offsets[i].fromArray(v);if(item.wall)offsets[i].z=0;else offsets[i].y=0;apply(i);}});}catch{/* Ignore invalid stored layouts. */}
  function cast(event:PointerEvent){const rect=renderer.domElement.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(mouse,camera);}
  function end(cancel=false){if(pointer===null)return;if(cancel){offsets[selected].copy(initial);apply(selected);}const id=pointer;pointer=null;if(overlay.hasPointerCapture(id))overlay.releasePointerCapture(id);overlay.style.cursor='grab';save();finish();}
  overlay.onpointerdown=event=>{if(event.button!==0||!active||!available)return;cast(event);room.updateMatrixWorld(true);
    // Respect foreground occlusion: do not grab props through the monitor or furniture.
    const hit=raycaster.intersectObjects(room.children,true).find(h=>h.object instanceof THREE.Mesh&&h.object.visible);
    const i=hit?owners.get(hit.object):undefined;if(i===undefined){selection(-1);invalidate();return;}
    selection(i);plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0,items[i].wall?0:1,items[i].wall?1:0),hit!.point);
    if(!raycaster.ray.intersectPlane(plane,start))return;
    initial.copy(offsets[i]);pointer=event.pointerId;overlay.setPointerCapture(pointer);overlay.style.cursor='grabbing';event.preventDefault();invalidate();};
  overlay.onpointermove=event=>{if(pointer!==event.pointerId)return;cast(event);if(raycaster.ray.intersectPlane(plane,point)){offsets[selected].copy(initial).add(point.sub(start));offsets[selected].clampScalar(-20,20);apply(selected);}event.preventDefault();};
  overlay.onpointerup=()=>end();overlay.onpointercancel=()=>end(true);overlay.onlostpointercapture=()=>end(true);
  const onKey=(event:KeyboardEvent)=>{
    if(event.key==='Escape'&&pointer!==null){event.preventDefault();event.stopImmediatePropagation();end(true);return;}
    if(!active||!available||selected<0||!panel.contains(event.target as Node)||event.target===text)return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();event.stopImmediatePropagation();const step=event.shiftKey?.1:.025;
    if(event.key==='ArrowLeft')offsets[selected].x-=step;
    if(event.key==='ArrowRight')offsets[selected].x+=step;
    if(event.key==='ArrowUp')offsets[selected][items[selected].wall?'y':'z']+=items[selected].wall?step:-step;
    if(event.key==='ArrowDown')offsets[selected][items[selected].wall?'y':'z']+=items[selected].wall?-step:step;
    offsets[selected].clampScalar(-20,20);apply(selected);save();finish();
  };window.addEventListener('keydown',onKey,true);
  toggle.onchange=()=>{end();active=toggle.checked;overlay.style.display=active&&available?'block':'none';updateHighlight();invalidate();};
  select.onchange=()=>{selection(select.value===''?-1:Number(select.value));invalidate();};
  const buttons=panel.querySelectorAll('button');
  buttons[0].onclick=async()=>{const json=JSON.stringify(data(),null,2);text.hidden=false;text.value=json;try{await navigator.clipboard.writeText(json);status.textContent='Layout copied.';}catch{status.textContent='Select and copy the JSON below.';}};
  buttons[1].onclick=()=>{end(true);offsets.forEach((v,i)=>{v.copy(defaults[i]);apply(i);});save();finish();status.textContent='Default layout restored.';};
  finish();
  return {
    setAvailable(value:boolean){if(available===value)return;available=value;if(!value)end(true);overlay.style.display=active&&available?'block':'none';toggle.disabled=!value;select.disabled=!value;status.textContent=value?'Enable Arrange room to drag props.':'Restart the scene to arrange the room.';updateHighlight();invalidate();},
    hideHighlight(){highlight.visible=false;},
    restoreHighlight(){updateHighlight();},
    dispose(){end(true);window.removeEventListener('keydown',onKey,true);panel.remove();overlay.remove();room.remove(highlight);highlight.geometry.dispose();(highlight.material as THREE.LineBasicMaterial).dispose();},
  };
}
