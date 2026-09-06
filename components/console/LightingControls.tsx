import './lighting-controls.css';
import { useRef, useState, useSyncExternalStore } from 'react';
import { getLighting, subscribeLighting, updateLighting, LIGHTING_DEFAULTS, LIGHTING_RANGES, refreshLightingReflection } from '@/lib/console/lighting';
const labels:Record<keyof typeof LIGHTING_RANGES,string>={ambient:'Ambient',environment:'Environment bounce',fill:'Front fill',desk:'Desk lamp',deskBeamAngle:'Desk beam angle',bedside:'Bedside lamp',window:'Window light',haze:'Atmospheric haze',exposure:'Exposure',screen:'Screen brightness',reflection:'Glass reflection',glassRoughness:'Glass roughness',clearcoatRoughness:'Clear-coat roughness',vignette:'Vignette',filmGrain:'Film grain',contactShading:'Contact shading',colorGrade:'Colour grade'};
export default function LightingControls(){
  const settings=useSyncExternalStore(subscribeLighting,getLighting,getLighting);
  const [open,setOpen]=useState(true),[exported,setExported]=useState(''),[status,setStatus]=useState('');
  const panel=useRef<HTMLElement>(null);
  const drag=useRef<{id:number;offsetX:number;offsetY:number}|null>(null);
  const [position,setPosition]=useState<{left:number;top:number}|null>(null);
  function beginDrag(event:React.PointerEvent<HTMLDivElement>){
    if(event.button!==0||!panel.current)return;
    const rect=panel.current.getBoundingClientRect();
    drag.current={id:event.pointerId,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function moveDrag(event:React.PointerEvent<HTMLDivElement>){
    const current=drag.current;if(!current||current.id!==event.pointerId||!panel.current)return;
    const rect=panel.current.getBoundingClientRect();
    setPosition({left:Math.max(0,Math.min(innerWidth-rect.width,event.clientX-current.offsetX)),top:Math.max(0,Math.min(innerHeight-rect.height,event.clientY-current.offsetY))});
  }
  function endDrag(event:React.PointerEvent<HTMLDivElement>){if(drag.current?.id===event.pointerId)drag.current=null;}
  async function copy(){
    const text=JSON.stringify(settings,null,2);setExported(text);
    try{await navigator.clipboard.writeText(text);setStatus('Settings copied.');}catch{setStatus('Select and copy the settings below.');}
  }
  return <aside ref={panel} className="lighting-dev" data-dev-controls aria-label="Lighting development controls" style={position?{left:position.left,top:position.top,right:'auto',bottom:'auto'}:undefined}>
    <div className="lighting-dev-header">
      <div className="lighting-dev-drag-handle" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>Lighting lab <span aria-hidden="true">⠿</span></div>
      <button className="lighting-dev-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="lighting-dev-panel">{open?'Collapse':'Expand'} <span>{open?'−':'+'}</span></button>
    </div>
    {open&&<div id="lighting-dev-panel" className="lighting-dev-panel">
      <p>Changes are live and saved in this browser. Development only.</p>
      {(Object.keys(labels) as (keyof typeof labels)[]).map(name=>{
        const [min,max,step]=LIGHTING_RANGES[name];
        return <label className="lighting-dev-slider" key={name}><span>{labels[name]}<output>{Number(settings[name].toFixed(3))}{name==='deskBeamAngle'?'°':''}</output></span><input type="range" aria-label={labels[name]} min={min} max={max} step={step} value={settings[name]} onChange={e=>updateLighting({[name]:Number(e.target.value)})}/></label>;
      })}
      <label className="lighting-dev-color">Both lamp colours<input type="color" value={settings.lampColor} onChange={e=>updateLighting({lampColor:e.target.value})}/></label>
      <div className="lighting-dev-actions">
        <button onClick={copy}>Copy settings</button>
        <button onClick={()=>{updateLighting(LIGHTING_DEFAULTS);setExported('');setStatus('Defaults restored.');}}>Reset</button>
        <button onClick={()=>{refreshLightingReflection();setStatus('Room reflection refreshed.');}}>Refresh reflection</button>
        <button onClick={()=>location.assign(location.pathname+location.search)}>Restart scene</button>
      </div>
      <p>Refresh the captured reflection after changing the lights.</p>
      <output className="lighting-dev-status" aria-live="polite">{status}</output>
      {exported&&<textarea aria-label="Lighting settings JSON" readOnly value={exported} onFocus={e=>e.target.select()}/>}
    </div>}
  </aside>;
}
