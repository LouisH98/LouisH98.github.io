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
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.route('http://screen-light.test/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/'){await route.fulfill({contentType:'text/html',body:'<!doctype html><title>Screen light regression</title>'});return;}
    let source;
    if(path.startsWith('/three.'))source=await readFile(`node_modules/three/build${path}`,'utf8');
    else if(path==='/RectAreaLightUniformsLib.js')source=await readFile('node_modules/three/examples/jsm/lights/RectAreaLightUniformsLib.js','utf8');
    else if(path==='/RectAreaLightTexturesLib.js')source=await readFile('node_modules/three/examples/jsm/lights/RectAreaLightTexturesLib.js','utf8');
    else source=ts.transpileModule(await readFile(`components/console${path.replace('.js','.ts')}`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    source=source.replaceAll("from 'three'","from '/three.module.js'");
    await route.fulfill({contentType:'text/javascript',body:source});
  });
  await page.goto('http://screen-light.test/');
  const results=await page.evaluate(async()=>{
    const THREE=await import('/three.module.js');
    const {createScreenLightSampler}=await import('/screenLightSampler.js');
    const {configureGlassReflection}=await import('/glassReflection.js');
    const {RectAreaLightUniformsLib}=await import('/RectAreaLightUniformsLib.js');
    RectAreaLightUniformsLib.init();
    const results=[];
    for(const fallback of [false,true]){
      const renderer=new THREE.WebGLRenderer();renderer.setSize(16,16);
      if(fallback){const has=renderer.extensions.has.bind(renderer.extensions);renderer.extensions.has=name=>name==='EXT_color_buffer_float'?false:has(name);}
      const sampler=createScreenLightSampler(renderer);
      const material=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:1});
      configureGlassReflection(material);sampler.configureMaterial(material);
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,10);camera.position.z=3;
      const geometry=new THREE.PlaneGeometry(3,3);scene.add(new THREE.Mesh(geometry,material));
      const light=new THREE.RectAreaLight(0xffffff,0,2,2);light.position.z=1;scene.add(light);
      const output=new THREE.WebGLRenderTarget(16,16),bytes=new Uint8Array(4);
      const pixels=new Uint8Array([255,0,0,255]);const picture=new THREE.DataTexture(pixels,1,1);picture.needsUpdate=true;
      const gl=renderer.getContext();let reads=0,bufferReads=0;
      const readPixels=gl.readPixels.bind(gl),getBufferSubData=gl.getBufferSubData.bind(gl);
      gl.readPixels=(...args)=>{reads++;return readPixels(...args);};
      gl.getBufferSubData=(...args)=>{bufferReads++;return getBufferSubData(...args);};
      renderer.compile(scene,camera);
      const times=[];
      async function settle(powered,brightness=1){
        for(let i=0;i<65;i++){
          await new Promise(requestAnimationFrame);
          const start=performance.now();
          sampler.update(picture,light,powered,brightness);
          renderer.setRenderTarget(output);renderer.render(scene,camera);
          times.push(performance.now()-start);
        }
      }
      function sample(){renderer.readRenderTargetPixels(output,8,8,1,1,bytes);reads--;return [...bytes];}
      await settle(true);const red=sample();
      pixels.set([0,0,255,255]);picture.needsUpdate=true;
      await settle(true);const blue=sample();
      await settle(false);const off=sample();
      await settle(true,0);const zeroBrightness=sample();
      await settle(true);const onAgain=sample();
      // Match the real TV/console placement, using a dim blue picture rather
      // than a full-bright test card. The console top must receive visible spill.
      const surface=scene.children.find(object=>object.isMesh);
      surface.position.set(0,-1.3,1.13);surface.rotation.x=-Math.PI/2;
      light.position.set(0,.1,.84);light.rotation.set(.18,Math.PI,0);
      camera.position.set(0,2,3);camera.lookAt(surface.position);
      pixels.set([1,2,6,255]);picture.needsUpdate=true;
      await settle(true,.9);const dimDesk=sample();
      await settle(false,.9);const deskOff=sample();
      const shader=material; // Verify the composed hook retained glass reflection support.
      const probe={uniforms:{},vertexShader:'#include <worldpos_vertex>',fragmentShader:'#include <envmap_physical_pars_fragment>\n#include <lights_fragment_begin>'};
      shader.onBeforeCompile(probe,renderer);
      times.sort((a,b)=>a-b);
      results.push({dimDesk,deskOff,glError:gl.getError(),fallback,red,blue,off,zeroBrightness,onAgain,reads,bufferReads,glassHookPreserved:probe.fragmentShader.includes('localGlassReflection'),updateAndRenderMs:{median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)}});
      sampler.dispose();sampler.dispose();picture.dispose();geometry.dispose();material.dispose();output.dispose();renderer.dispose();
    }
    return results;
  });
  assert.deepEqual(errors,[],'WebGL shader compilation and page errors');
  for(const r of results){
    assert.equal(r.glError,0);assert.equal(r.reads,0);assert.equal(r.bufferReads,0);assert.equal(r.glassHookPreserved,true);
    assert.ok(r.red[0]>20&&r.red[0]>r.red[2]*4,JSON.stringify(r));
    assert.ok(r.blue[2]>20&&r.blue[2]>r.blue[0]*4,JSON.stringify(r));
    assert.deepEqual(r.off.slice(0,3),[0,0,0]);assert.deepEqual(r.zeroBrightness.slice(0,3),[0,0,0]);
    assert.ok(r.onAgain[2]>20);
    assert.ok(r.dimDesk[2]>5&&r.dimDesk[2]>r.dimDesk[0]*2,JSON.stringify(r));
    assert.deepEqual(r.deskOff.slice(0,3),[0,0,0]);
  }
  console.log(JSON.stringify({passed:true,results},null,2));
} finally {await browser.close();}
