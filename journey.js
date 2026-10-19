export const clamp = (n, a=0, b=1) => Math.max(a, Math.min(b,n));
export const smooth = n => { n=clamp(n); return n*n*(3-2*n); };
export function random(seed) { return () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296); }
export function renderSize(width,height,dpr,quality){
 const high=quality==='high',density=Math.min(Math.max(1,dpr||1),high?1.5:1.15);
 const ratio=Math.min(density,(high?2400:1600)/Math.max(width,height),Math.sqrt((high?3200000:1600000)/(width*height)));
 return {width:Math.round(width*ratio),height:Math.round(height*ratio),ratio};
}
export const TIMING={map:8,dissolve:4,approach:6.5};
// One forward move spans dissolve and approach: starts from rest, peaks as the paper
// clears, then a long deceleration to the threshold (velocity ∝ u(1-u)²).
export const dolly=u=>{u=clamp(u);return 6*u*u-8*u*u*u+3*u*u*u*u;};
// Anchor steps to travelled distance: existing prints never crawl when the camera advances.
export function walkingTrace(world,distance){
 const step=13,span=2100,prints=[];
 for(let i=Math.max(0,Math.ceil((distance-span)/step));i*step<=distance;i++){
  const p=world.atDistance(i*step),side=i%2?1:-1,offset=side*3.1;
  prints.push({x:p.x-Math.sin(p.angle)*offset,y:p.y+Math.cos(p.angle)*offset,angle:p.angle,side,
   opacity:smooth((distance-i*step)/7)*Math.min(1,(span-distance+i*step)/250)});
 }
 return prints;
}
export class Journey {
 constructor(){this.reset();}
 reset(){this.phase='map';this.time=0;this.phaseTime=0;this.travel=0;this.ready=false;this.error=false;}
 tick(dt){
  // No elapsed background time or resume leap. Asset readiness, not a fake percentage, gates arrival.
  dt=clamp(dt,0,.1);this.time+=dt;this.phaseTime+=dt;
  if(this.phase==='map'){
   // a failed download stops the walk (the traveller waits for a retry) instead of hiding it
   if(!this.error)this.travel+=dt*240;
   if(this.ready&&!this.error&&this.time>=TIMING.map){this.phase='dissolve';this.phaseTime=0;}
  }else if(this.phase==='dissolve'){
   this.travel+=dt*240*(1-smooth(this.phaseTime/TIMING.dissolve));
   if(this.phaseTime>=TIMING.dissolve){this.phase='approach';this.phaseTime=0;}
  }else if(this.phase==='approach'&&this.phaseTime>=TIMING.approach){this.phase='arrived';this.phaseTime=0;}
 }
 get dissolve(){return this.phase==='map'?0:this.phase==='dissolve'?smooth(this.phaseTime/TIMING.dissolve):1;}
 get advance(){
  if(this.phase==='map')return 0;
  if(this.phase==='arrived')return 1;
  // One camera curve spans both phases; clearing the paper must not brake the camera.
  return dolly((this.phaseTime+(this.phase==='approach'?TIMING.dissolve:0))/(TIMING.dissolve+TIMING.approach));
 }
}
