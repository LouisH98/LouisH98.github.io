/** Smooth, independent flights: continuous angular motion, no waypoint stops. */
export function cityParticle(particle:number,seconds:number,aspect:number){
  const t=Math.max(0,seconds),phase=particle*1.73;
  const angle=t*(.48+particle*.035)+phase+.16*Math.sin(t*.31+phase);
  return {
    x:aspect*(.65*Math.cos(angle)+.08*Math.sin(t*.37+phase)),
    y:.55*Math.sin(angle)+.07*Math.cos(t*.29+phase*1.3),
  };
}

/** The newcomers wait beyond four different screen edges, never on a parent. */
export function incomingParticle(particle:number,seconds:number,aspect:number){
  const angle=particle*Math.PI/2;
  const drift=.12*Math.sin(seconds*.4+particle);
  return {x:Math.cos(angle)*(aspect+.55)-Math.sin(angle)*drift,
    y:Math.sin(angle)*1.55+Math.cos(angle)*drift};
}

/** The intro and menu share these exact rotating slots; no mode switch. */
export function particleSlot(index:number,seconds:number,radius:number){
  const angle=index*Math.PI/4+seconds*.35;
  return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,depth:Math.sin(angle)*.2};
}
