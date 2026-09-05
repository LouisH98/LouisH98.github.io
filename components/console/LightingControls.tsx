import './lighting-controls.css';
import { useState, useSyncExternalStore } from 'react';
import { getLighting, subscribeLighting, updateLighting, LIGHTING_DEFAULTS, LIGHTING_RANGES, refreshLightingReflection } from '@/lib/console/lighting';
const labels:Record<keyof typeof LIGHTING_RANGES,string>={ambient:'Ambient',environment:'Environment bounce',fill:'Front fill',desk:'Desk lamp',bedside:'Bedside lamp',window:'Window light',haze:'Window haze',exposure:'Exposure',screen:'Screen brightness',reflection:'Glass reflection',glassRoughness:'Glass roughness',clearcoatRoughness:'Clear-coat roughness'};
export default function LightingControls(){
  const settings=useSyncExternalStore(subscribeLighting,getLighting,getLighting);
  const [open,setOpen]=useState(true),[exported,setExported]=useState(''),[status,setStatus]=useState('');
  async function copy(){
    const text=JSON.stringify(settings,null,2);setExported(text);
    try{await navigator.clipboard.writeText(text);setStatus('Settings copied.');}catch{setStatus('Select and copy the settings below.');}
  }
  return <aside className="lighting-dev" data-dev-controls aria-label="Lighting development controls">
    <button className="lighting-dev-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="lighting-dev-panel">Lighting lab <span>{open?'−':'+'}</span></button>
    {open&&<div id="lighting-dev-panel" className="lighting-dev-panel">
      <p>Changes are live and saved in this browser. Development only.</p>
      {(Object.keys(labels) as (keyof typeof labels)[]).map(name=>{
        const [min,max,step]=LIGHTING_RANGES[name];
        return <label className="lighting-dev-slider" key={name}><span>{labels[name]}<output>{Number(settings[name].toFixed(3))}</output></span><input type="range" aria-label={labels[name]} min={min} max={max} step={step} value={settings[name]} onChange={e=>updateLighting({[name]:Number(e.target.value)})}/></label>;
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
