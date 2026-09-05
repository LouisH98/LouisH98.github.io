import { smooth } from './timeline';

export const PARTICLE_ORBIT_SPEED=.7;

/** Smooth, independent flights: continuous angular motion, no waypoint stops. */
function cityFlight(particle:number,seconds:number,aspect:number){
  const t=Math.max(0,seconds),phase=particle*1.73;
  const angle=t*(.48+particle*.035)+phase+.16*Math.sin(t*.31+phase);
  return {
    x:aspect*(.65*Math.cos(angle)+.08*Math.sin(t*.37+phase)),
    y:.55*Math.sin(angle)+.07*Math.cos(t*.29+phase*1.3),
  };
}

export const cityParticle=cityFlight;

/** The newcomers wait beyond four different screen edges, never on a parent. */
export function incomingParticle(particle:number,seconds:number,aspect:number){
  const angle=particle*Math.PI/2;
  const drift=.12*Math.sin(seconds*.4+particle);
  return {x:Math.cos(angle)*(aspect+.55)-Math.sin(angle)*drift,
    y:Math.sin(angle)*1.55+Math.cos(angle)*drift};
}

/** The intro and menu share these exact rotating slots; no mode switch. */
export function particleSlot(index:number,seconds:number,radius:number){
  const angle=index*Math.PI/4+seconds*PARTICLE_ORBIT_SPEED;
  return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,depth:Math.sin(angle)*.2};
}

export type FlightPoint={x:number;y:number};
export type ParticleJoin={start:FlightPoint;velocity:FlightPoint;slot:number;startTime:number;endTime:number;radius:number};

/** Assign slots in angular order, minimizing travel from momentum-projected positions. */
export function assignParticleSlots(points:FlightPoint[],velocities:FlightPoint[],endTime:number,radius:number){
  const predicted=points.map((p,i)=>({x:p.x+velocities[i].x*.7,y:p.y+velocities[i].y*.7}));
  const order=predicted.map((p,i)=>({i,angle:Math.atan2(p.y,p.x)})).sort((a,b)=>a.angle-b.angle);
  const slots=points.map((_,i)=>{const p=particleSlot(i,endTime,radius);return {i,angle:Math.atan2(p.y,p.x)};}).sort((a,b)=>a.angle-b.angle);
  let best=Infinity,result:number[]=[];
  for(let shift=0;shift<points.length;shift++){
    const candidate:number[]=[];let cost=0;
    order.forEach((p,k)=>{const slot=slots[(k+shift)%slots.length].i,target=particleSlot(slot,endTime,radius);
      candidate[p.i]=slot;cost+=(predicted[p.i].x-target.x)**2+(predicted[p.i].y-target.y)**2;
    });
    if(cost<best){best=cost;result=candidate;}
  }
  return result;
}

/** One fixed Hermite flight arrives with exactly the orbit's tangential velocity. */
export function joinedParticle(join:ParticleJoin,seconds:number):FlightPoint{
  if(seconds>=join.endTime)return particleSlot(join.slot,seconds,join.radius);
  const duration=join.endTime-join.startTime;
  const t=Math.max(0,(seconds-join.startTime)/duration),t2=t*t,t3=t2*t;
  const end=particleSlot(join.slot,join.endTime,join.radius);
  const endVelocity={x:-end.y*PARTICLE_ORBIT_SPEED,y:end.x*PARTICLE_ORBIT_SPEED};
  const axis=(key:'x'|'y')=>(2*t3-3*t2+1)*join.start[key]+(t3-2*t2+t)*duration*join.velocity[key]
    +(-2*t3+3*t2)*end[key]+(t3-t2)*duration*endVelocity[key];
  return {x:axis('x'),y:axis('y')};
}

/** Keep particle order while gathering into an arc, then relaxing to a full ring. */
export function menuParticleSlot(index:number,seconds:number,radius:number,amount:number,cycleTime=seconds){
  const cycle=cycleTime%32;
  const gather=amount*(cycle<9?0:cycle<17?smooth((cycle-9)/8):cycle<21?1:cycle<30?1-smooth((cycle-21)/9):0);
  // Pair neighboring slots only while the ring is spread out. Both lights
  // move toward the pair midpoint, preserving order and avoiding overtaking.
  const pairCycle=cycleTime%23;
  const pairing=amount*(1-gather)*smooth((pairCycle-1)/3)*(1-smooth((pairCycle-7)/4));
  const pairOffset=(index%2===0?1:-1)*(Math.PI/4-.12)*.5*pairing;
  const angle=index*Math.PI/4+seconds*PARTICLE_ORBIT_SPEED+(3.5-index)*(Math.PI/4-.16)*gather+pairOffset;
  return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,depth:Math.sin(angle)*.2};
}
