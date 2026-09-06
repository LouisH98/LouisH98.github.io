export const LIGHTING_DEFAULTS = {
  ambient:0,environment:0,fill:2,desk:24,deskBeamAngle:82,bedside:9.2,window:28.5,
  haze:.033,exposure:.54,screen:.9,reflection:2,glassRoughness:.13,clearcoatRoughness:0,
  vignette:.4,filmGrain:.057,contactShading:.7,colorGrade:0,
  lampColor:'#ffb66d',
};
export type LightingSettings = typeof LIGHTING_DEFAULTS;
export const LIGHTING_RANGES = {
  ambient:[0,1.5,.01],environment:[0,2,.01],fill:[0,2,.01],desk:[0,24,.1],deskBeamAngle:[20,110,1],bedside:[0,20,.1],window:[0,60,.5],
  haze:[0,.12,.001],exposure:[.25,2.5,.01],screen:[0,3,.05],reflection:[0,2,.01],glassRoughness:[0,.5,.005],clearcoatRoughness:[0,.4,.005],
  vignette:[0,.4,.005],filmGrain:[0,.25,.001],contactShading:[0,2,.05],colorGrade:[0,2,.05],
} as const;
const key='ps2folio:dev-lighting:v2';
export function normalizeLighting(value: unknown): LightingSettings {
  const result={...LIGHTING_DEFAULTS};
  if(!value||typeof value!=='object')return result;
  const input=value as Record<string,unknown>;
  for(const name of Object.keys(LIGHTING_RANGES) as (keyof typeof LIGHTING_RANGES)[]) {
    const n=input[name], [min,max]=LIGHTING_RANGES[name];
    if(typeof n==='number'&&Number.isFinite(n))result[name]=Math.min(max,Math.max(min,n));
  }
  if(typeof input.lampColor==='string'&&/^#[0-9a-f]{6}$/i.test(input.lampColor))result.lampColor=input.lampColor;
  return result;
}
let settings={...LIGHTING_DEFAULTS};
if(import.meta.env?.DEV && typeof window!=='undefined') {
  try { settings=normalizeLighting(JSON.parse(localStorage.getItem(key)||'null')); } catch { /* Defaults remain available if storage is blocked. */ }
}
const listeners=new Set<()=>void>();
let reflectionRevision=0;
export const getLighting=()=>settings;
export const getReflectionRevision=()=>reflectionRevision;
export const subscribeLighting=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function updateLighting(patch:Partial<LightingSettings>) {
  if(!import.meta.env?.DEV)return;
  settings=normalizeLighting({...settings,...patch});
  try { localStorage.setItem(key,JSON.stringify(settings)); } catch { /* Live controls still work. */ }
  listeners.forEach(listener=>listener());
}
export function refreshLightingReflection(){reflectionRevision++;listeners.forEach(listener=>listener());}
