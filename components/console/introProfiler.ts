import * as THREE from 'three';

/** Opt-in local profiler: ?profileIntro=1; use =gpu for asynchronous GPU timings. */
export function createIntroProfiler(renderer: THREE.WebGLRenderer) {
  const gl=renderer.getContext() as WebGL2RenderingContext;
  const ext=new URLSearchParams(location.search).get('profileIntro')==='gpu'?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
  type Row={phase:string;cpu:number;gap:number;calls:number;triangles:number};
  const frames:Row[]=[];
  const passes:Record<string,{cpu:number[];gpu:number[]}>= {};
  const pending:{query:WebGLQuery;name:string}[]=[];
  const longTasks:{start:number;duration:number}[]=[];
  const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push({start:e.startTime,duration:e.duration});if(longTasks.length>256)longTasks.splice(0,longTasks.length-256);});
  if(PerformanceObserver.supportedEntryTypes.includes('longtask'))observer.observe({type:'longtask'});
  const original=renderer.render.bind(renderer);
  let phase='initialization',start=0,previous=0,started=0,done=false,calls=0,triangles=0;
  renderer.render=function(scene,camera){
    if(done)return original.call(this,scene,camera);
    const name=`${phase}/${scene.name||scene.type}`;
    const bucket=passes[name]??={cpu:[],gpu:[]};
    const query=ext&&pending.length<256?gl.createQuery():null;
    if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
    const before=performance.now();
    try {original.call(this,scene,camera);}
    finally {
      bucket.cpu.push(performance.now()-before);
      if(bucket.cpu.length>4096)bucket.cpu.shift();
      calls+=renderer.info.render.calls;triangles+=renderer.info.render.triangles;
      if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({query,name});}
    }
  };
  const stats=(values:number[])=>{
    const a=[...values].sort((a,b)=>a-b);
    return {n:a.length,mean:a.reduce((a,b)=>a+b,0)/(a.length||1),p95:a[Math.floor(a.length*.95)]??0,max:a.at(-1)??0};
  };
  function poll(){
    const disjoint=ext&&gl.getParameter(ext.GPU_DISJOINT_EXT);
    for(let i=pending.length-1;i>=0;i--){
      const item=pending[i];
      if(!gl.getQueryParameter(item.query,gl.QUERY_RESULT_AVAILABLE))continue;
      if(!disjoint)passes[item.name].gpu.push(gl.getQueryParameter(item.query,gl.QUERY_RESULT)/1e6);
      gl.deleteQuery(item.query);pending.splice(i,1);
    }
  }
  return {
    begin(next:string,now:number){
      if(done)return;
      poll();phase=next;start=performance.now();calls=0;triangles=0;
      if(next!=='standby'&&!started)started=now;
    },
    end(now:number){
      if(done)return;
      if(frames.length>=4096)frames.shift();
      frames.push({phase,cpu:performance.now()-start,gap:previous?now-previous:0,calls,triangles});previous=now;
      if(started&&now-started>14500){
        poll();done=true;observer.disconnect();
        const report={viewport:[innerWidth,innerHeight,devicePixelRatio],gpuTimers:Boolean(ext),phases:Object.fromEntries([...new Set(frames.map(f=>f.phase))].map(p=>{
          const rows=frames.filter(f=>f.phase===p);return [p,{cpu:stats(rows.map(f=>f.cpu)),frameInterval:stats(rows.map(f=>f.gap)),drawCalls:stats(rows.map(f=>f.calls)),triangles:stats(rows.map(f=>f.triangles)),over33ms:rows.filter(f=>f.gap>33.4).length}];
        })),passes:Object.fromEntries(Object.entries(passes).map(([k,v])=>[k,{cpu:stats(v.cpu),gpu:stats(v.gpu)}])),hitches:frames.filter(f=>f.gap>50),longTasks};
        const output=document.createElement('pre');output.id='intro-profile';output.hidden=true;output.textContent=JSON.stringify(report);document.body.append(output);
        console.info('INTRO_PROFILE',JSON.stringify(report));
      }
    },
    dispose(){renderer.render=original;observer.disconnect();pending.forEach(p=>gl.deleteQuery(p.query));document.getElementById('intro-profile')?.remove();},
  };
}
