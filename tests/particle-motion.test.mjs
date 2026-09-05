import test from 'node:test';
import assert from 'node:assert/strict';
import {cityParticle,incomingParticle,particleSlot} from '../lib/console/particleMotion.ts';
test('city flights glide with continuous velocity and no waypoint pauses',()=>{
 const h=.001;
 for(let i=0;i<4;i++)for(let t=.01;t<12;t+=.03){
  const a=cityParticle(i,t-h,4/3),b=cityParticle(i,t,4/3),c=cityParticle(i,t+h,4/3);
  assert.ok(Math.abs(b.x)<=4/3*.73&&Math.abs(b.y)<=.62);
  assert.ok(Math.hypot(c.x-a.x,c.y-a.y)/(2*h)>.1);
  assert.ok(Math.hypot(c.x-2*b.x+a.x,c.y-2*b.y+a.y)/h<.002);
 }
});
test('newcomers stay beyond the screen before gathering on desktop and portrait',()=>{
 for(const aspect of [.5,4/3,2.4])for(let i=0;i<4;i++)for(let t=0;t<12;t+=.2){
  const p=incomingParticle(i,t,aspect);
  assert.ok(Math.abs(p.x)>aspect+.3||Math.abs(p.y)>1.3);
 }
});
test('eight evenly spaced slots continue past boot without changing paths',()=>{
 for(let i=0;i<8;i++){
  const a=particleSlot(i,12,.31),next=particleSlot((i+1)%8,12,.31),b=particleSlot(i,12.001,.31);
  assert.ok(Math.abs(Math.hypot(a.x,a.y)-.31)<1e-12);
  assert.ok(Math.abs(Math.hypot(a.x-next.x,a.y-next.y)-2*.31*Math.sin(Math.PI/8))<1e-12);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.0002);
 }
});
