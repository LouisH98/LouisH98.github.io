// Standalone WebGL regression check. No application UI or external network needed.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';

const executablePath=process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const browser=await chromium.launch({executablePath,headless:true});
try {
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());else if(message.type()==='warning')console.warn(message.text());});
  await page.route('http://screen-light.test/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/'){await route.fulfill({contentType:'text/html',body:'<!doctype html><title>Screen light regression</title>'});return;}
    let source;
    if(path.startsWith('/three.'))source=await readFile(`node_modules/three/build${path}`,'utf8');
    else if(path==='/RectAreaLightUniformsLib.js')source=await readFile('node_modules/three/examples/jsm/lights/RectAreaLightUniformsLib.js','utf8');
    else if(path==='/RectAreaLightTexturesLib.js')source=await readFile('node_modules/three/examples/jsm/lights/RectAreaLightTexturesLib.js','utf8');
    else source=ts.transpileModule(await readFile(`${path.startsWith('/lib/')?'.':'components/console'}${path.replace('.js','.ts')}`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    source=source.replaceAll("from 'three'","from '/three.module.js'");
    source=source.replace(/from '(@\/[^']+)'/g,(_,p)=>`from '/${p.slice(2)}.js'`).replace(/from '(\.\/[\w]+)'/g,(_,p)=>`from '${p}.js'`);
    await route.fulfill({contentType:'text/javascript',body:source});
  });
  await page.goto('http://screen-light.test/');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/three.module.js');
    const {createCrtShader}=await import('/crtShader.js');
    const {createWindowAtmosphere}=await import('/windowAtmosphere.js');
    const {createLinearTarget}=await import('/renderPipeline.js');
    const renderer=new THREE.WebGLRenderer({alpha:true});renderer.setSize(32,32);
    const crt=createCrtShader(renderer);crt.resize(32,32);
    const tv=createLinearTarget(renderer,32,32),atmosphere=createWindowAtmosphere(renderer);
    const room=new THREE.Scene();room.background=new THREE.Color(.02,.03,.04);
    const camera=new THREE.PerspectiveCamera(40,1,.05,60);camera.position.z=3;camera.updateMatrixWorld();
    const lamp=new THREE.SpotLight();lamp.position.set(2,3,1);lamp.target.position.set(0,0,0);
    renderer.shadowMap.enabled=true;lamp.castShadow=true;lamp.shadow.mapSize.set(32,32);room.add(lamp,lamp.target);
    const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial({color:0x101010});
    const box=new THREE.Mesh(geometry,material);box.castShadow=true;room.add(box);
    const gl=renderer.getContext(),bytes=new Uint8Array(4);
    function pixel(){gl.readPixels(16,16,1,1,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return [...bytes];}
    const samples=[];
    for(const color of [new THREE.Color(.005,.008,.02),new THREE.Color(.1,.4,.8),new THREE.Color(2,1,.2)]){
      renderer.setRenderTarget(crt.target);renderer.setClearColor(color,1);renderer.clear();
      crt.render(renderer,0,0,tv);
      const frames=[];
      for(const progress of [.9,.95,.99,.9999,1]){
        atmosphere.render(renderer,room,camera,lamp,progress,0,tv.texture);frames.push(pixel());
      }
      crt.render(renderer,0,0);const direct=pixel();samples.push({frames,direct});
    }
    const glError=gl.getError();
    geometry.dispose();material.dispose();lamp.dispose();atmosphere.dispose();tv.dispose();crt.dispose();renderer.dispose();
    return {samples,glError};
  });
  assert.deepEqual(errors,[]);
  assert.equal(result.glError,0);
  for(const {frames,direct} of result.samples){
    for(let c=0;c<4;c++){
      assert.ok(Math.abs(frames.at(-1)[c]-direct[c])<=1,JSON.stringify({frames,direct}));
      assert.ok(Math.abs(frames.at(-2)[c]-direct[c])<=1,JSON.stringify({frames,direct}));
      for(let i=1;i<frames.length;i++)assert.ok(Math.abs(frames[i][c]-direct[c])<=Math.abs(frames[i-1][c]-direct[c])+1);
    }
  }
  console.log(JSON.stringify({passed:true,...result},null,2));
} finally {await browser.close();}
