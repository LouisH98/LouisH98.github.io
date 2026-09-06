import { chromium } from '@playwright/test';
import { writeFile, readdir, stat, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const label=process.argv[2]||'baseline';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const runs=[];
for(let i=0;i<3;i++){
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:1250000,uploadThroughput:625000});
 await page.addInitScript(()=>{new MutationObserver(()=>{if(document.querySelector('#startup-loader[data-ready]')&&!window.roomReady)window.roomReady=performance.now();}).observe(document,{subtree:true,attributes:true});});
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.roomReady,{},{timeout:60000});
 await page.waitForLoadState("networkidle");
 await page.waitForTimeout(500);
 runs.push(await page.evaluate(()=>({roomReady:window.roomReady,paint:performance.getEntriesByType('paint').map(e=>({name:e.name,start:e.startTime})),resources:performance.getEntriesByType('resource').map(e=>({url:new URL(e.name).pathname,bytes:e.encodedBodySize,duration:e.duration,end:e.responseEnd}))})));
 runs.at(-1).errors=errors;await context.close();
}
await browser.close();
async function inventory(dir){const files=[];for(const name of await readdir(dir)){const p=`${dir}/${name}`;if((await stat(p)).isDirectory())files.push(...await inventory(p));else {const b=await readFile(p);files.push({path:p,bytes:b.length,gzip:gzipSync(b).length});}}return files;}
const report={conditions:'Chrome headless, 1440x900 DPR1, fresh context/cache disabled, 10 Mbps down, 40ms latency, local uncompressed server; 3 runs',runs,files:await inventory('dist/client')};
await writeFile(`artifacts/load-${label}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({label,ready:runs.map(r=>Math.round(r.roomReady)),bytes:runs.map(r=>r.resources.reduce((n,r)=>n+r.bytes,0)),errors:runs.map(r=>r.errors)}));
