import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConsoleAudio } from '../lib/console/audio.ts';

function setup() {
  const calls = [], sources = [];
  globalThis.__PAGES_BASE_PATH__ = '';
  globalThis.document = { hidden: false };
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async()=>new ArrayBuffer(1) });
  globalThis.AudioContext = class {
    destination = {};
    async resume() { calls.push('resume'); }
    async suspend() { calls.push('suspend'); }
    async close() { calls.push('close'); }
    async decodeAudioData() { return { duration: 10 }; }
    createGain() { return {gain:{value:1},connect(){},disconnect(){}}; }
    createBufferSource() {
      const source={loop:false,connect(){},disconnect(){},start(when=0,offset=0){calls.push({offset,loop:this.loop});},stop(){calls.push('stop');this.onended?.();}};
      sources.push(source); return source;
    }
  };
  let frame = {boot:true,elapsed:2.5}; const errors=[];
  const controller = new ConsoleAudio(()=>frame,error=>errors.push(error));
  return {controller,calls,sources,errors,setFrame:(f)=>{frame=f;}};
}
test('audio is silent until enabled and joins the current boot position', async()=>{
  const s=setup(); s.controller.sync(); s.controller.cue('move'); assert.deepEqual(s.calls,[]);
  assert.equal(await s.controller.enable(),true);
  assert.deepEqual(s.calls.at(-1),{offset:2.5,loop:false});
  s.setFrame({boot:false,elapsed:8.8});s.controller.sync();
  assert.deepEqual(s.calls.at(-1),{offset:0,loop:true});
  const count=s.sources.length;s.controller.sync();assert.equal(s.sources.length,count);
  s.controller.disable();s.controller.cue('enter');assert.equal(s.sources.length,count);
  s.controller.dispose();
});
test('visibility pauses audio and resumes at the current timeline position', async()=>{
  const s=setup();await s.controller.enable();document.hidden=true;s.controller.visibility();
  assert.equal(s.calls.at(-1),'suspend');
  s.setFrame({boot:true,elapsed:4});document.hidden=false;s.controller.visibility();await Promise.resolve();
  assert.deepEqual(s.calls.at(-1),{offset:4,loop:false});s.controller.dispose();
});
test('failed audio reports a recoverable error without throwing',async()=>{
  const s=setup();globalThis.fetch=async()=>({ok:false});
  assert.equal(await s.controller.enable(),false);assert.equal(s.errors.length,1);s.controller.dispose();
});
test('disposal while files are loading cannot start late audio',async()=>{
  const s=setup();
  // Hold context resume instead of multiple file promises.
  const Context=globalThis.AudioContext;let resume;
  globalThis.AudioContext=class extends Context {resume(){return new Promise(r=>{resume=r;});}};
  const enabling=s.controller.enable();s.controller.dispose();
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
  resume();assert.equal(await enabling,false);assert.equal(s.sources.length,0);
});

test('blocked default autoplay returns promptly and unlocks on a later gesture',async()=>{
  const s=setup(), Context=globalThis.AudioContext;let allowed=false;
  globalThis.AudioContext=class extends Context {
    state='suspended';
    async resume(){if(allowed)this.state='running';}
  };
  assert.equal(await s.controller.enable(true),false);
  assert.equal(s.sources.length,0);assert.deepEqual(s.errors,[]);
  allowed=true;
  assert.equal(await s.controller.enable(),true);
  assert.equal(s.sources.length,1);s.controller.dispose();
});
test('muting during unlock prevents delayed playback',async()=>{
  const s=setup(), Context=globalThis.AudioContext;let resume;
  globalThis.AudioContext=class extends Context {resume(){return new Promise(r=>{resume=r;});}};
  const enabling=s.controller.enable();s.controller.disable();resume();
  assert.equal(await enabling,false);assert.equal(s.sources.length,0);s.controller.dispose();
});

test('CRT ignition unlocks audio silently, then starts boot at the timeline handoff', async()=>{
  const s=setup();
  s.setFrame({boot:true,elapsed:-1.15});
  assert.equal(await s.controller.enable(),true);
  s.controller.cue('move');
  assert.equal(s.sources.length,0);
  s.setFrame({boot:true,elapsed:0});s.controller.sync(true);
  assert.deepEqual(s.calls.at(-1),{offset:0,loop:false});
  s.setFrame({boot:true,elapsed:-1.15});s.controller.sync(true);
  assert.equal(s.calls.at(-1),'stop');
  s.controller.dispose();
});


test('shutdown cuts ambience, plays once, and cannot restart menu audio', async()=>{
  const s=setup();s.setFrame({boot:false,elapsed:12});await s.controller.enable();
  const before=s.sources.length;s.controller.shutdown();
  assert.equal(s.sources.length,before+1);assert.deepEqual(s.calls.at(-1),{offset:0,loop:false});
  s.controller.sync();s.controller.cue('move');assert.equal(s.sources.length,before+1);
  s.controller.disable();assert.equal(s.calls.at(-1),'stop');s.controller.dispose();
});
test('muted shutdown stays silent',async()=>{
  const s=setup();await s.controller.enable();s.controller.disable();
  const before=s.sources.length;s.controller.shutdown();assert.equal(s.sources.length,before);s.controller.dispose();
});
