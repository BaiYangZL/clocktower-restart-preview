import {clamp,smooth} from './journey.js';

// One walk cycle (two steps, eight frames) must cover the ground the drawn boots cover:
// in the v4 NE frames the planted boot travels back ~17 art px over two frames, along a path
// running ~0.88 across the screen, i.e. ~112 scene units per cycle at the 120-unit body.
// 42 swung the legs ~2.7x faster than the body moved, which read as gliding.
// 96 units/s is ~1.7 steps/s, an unhurried stride (~7 frames/s).
export const WALK_SPEED=96, WALK_CYCLE_DISTANCE=112, WALK_ACCEL=210;
export const REACH_TIME=.7, PUSH_RELEASE=1.8, HAND_RELEASE=.3;
// Measured supporting soles in the existing 96px cells, not a new character scale.
const SOLES={NE:[[30,89],[57,89],[55,89],[42,89],[32,89],[58,89],[54,89],[43,89]],
 SW:[[33,89],[43,89],[48,89],[58,89],[31,88],[43,89],[48,89],[58,89]],
 NW:[[70,89],[44,89],[47,89],[58,89],[70,89],[44,89],[49,89],[60,89]]};
export function footSupport(g){
 if(g.walk==null||!SOLES[g.dir])return null;
 const k=g.walk*8,i=Math.floor(k)%8,sole=SOLES[g.dir][i];
 const start=g.dir==='SW'?0:1,phase=((k-start)%4+4)%4;
 const tangent=g.tangent||{x:g.dir==='NE'?.88:-.88,y:g.dir==='SW'?.47:-.47};
 const centre=g.dir==='NW'?56:46,mix=clamp((g.speed??WALK_SPEED)/40);
 // Bound the correction: these generated frames cannot support an unlimited IK stretch.
 const dx=clamp(centre-tangent.x*(phase-1.5)*WALK_CYCLE_DISTANCE/12-sole[0],-5,5)*mix;
 const dy=clamp(87-tangent.y*(phase-1.5)*WALK_CYCLE_DISTANCE/12-sole[1],-4,4)*mix;
 return {x:sole[0],y:sole[1],dx,dy};
}
export function direction(dx,dy){
 const names=['E','SE','S','SW','W','NW','N','NE'];
 return names[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
}

// Game-time only: neither a network response nor a dialogue click opens the door.
export class GateStory{
 constructor({spots,maxDoor,leafPoint,onEnd=()=>{}}){
  Object.assign(this,{spots,maxDoor,leafPoint,onEnd});this.reset();
 }
 reset(){
  this.phase='idle';this.t=0;this.door=0;this.letter=true;this.authorized=false;
  this.g={...this.spots.stand,dir:'S',walk:null,arms:null,contact:0,lean:0,speed:0};
  this.path=null;this.ended=false;this.started=false;this.travelled=0;this.pushReleaseAt=0;
 }
 go(phase,_pose,opts={}){
  this.phase=phase;this.t=0;this.path=null;this.g.walk=null;this.g.arms=null;this.g.contact=0;this.g.lean=0;this.g.speed=0;
  if(opts.dir)this.g.dir=opts.dir;
 }
 accept(){this.authorized=true;this.go('accepted');}
 lead(){
  if(!this.authorized)return false;
  this.go('bow');return true;
 }
 walk(phase,points){
  this.go(phase);this.travelled=0;
  const vertices=[{x:this.g.x,y:this.g.y},...points],segments=[];
  for(let i=1;i<vertices.length;i++){
   const a=vertices[i-1],b=vertices[i],length=Math.hypot(b.x-a.x,b.y-a.y);
   if(length)segments.push({a,b,length});
  }
  this.path={segments,length:segments.reduce((s,p)=>s+p.length,0),distance:0,speed:0,index:0};
 }
 tick(dt){
  this.t+=dt;
  if(this.path){
   const p=this.path;
   // Accelerate and brake by distance; do not ease the walk cycle independently.
   const target=Math.min(WALK_SPEED,Math.sqrt(Math.max(0,2*WALK_ACCEL*(p.length-p.distance))));
   p.speed=Math.min(target,p.speed+WALK_ACCEL*dt);
   p.distance=Math.min(p.length,p.distance+Math.max(p.speed,2)*dt);
   this.travelled=p.distance;
   let d=p.distance,s=p.segments[0];
   for(let i=0;i<p.segments.length;i++){s=p.segments[i];if(d<=s.length||i===p.segments.length-1)break;d-=s.length;}
   if(s){
    const k=clamp(d/s.length);
    this.g.x=s.a.x+(s.b.x-s.a.x)*k;this.g.y=s.a.y+(s.b.y-s.a.y)*k;
    this.g.dir=direction(s.b.x-s.a.x,s.b.y-s.a.y);
    this.g.walk=p.distance/WALK_CYCLE_DISTANCE;
    this.g.speed=p.speed;this.g.tangent={x:(s.b.x-s.a.x)/s.length,y:(s.b.y-s.a.y)/s.length};
   }
  }
  const done=this.path&&this.path.distance>=this.path.length;
  switch(this.phase){
   case 'notice':if(this.t>=.8)this.go('idle');break;
   case 'offer':if(this.t>=.8)this.go('hold');break;
   case 'release':if(this.t>=.5)this.go('wait');break;
   case 'deny':if(this.t>=2.6)this.go('wait');break;
   case 'puzzle':if(this.t>=1.6)this.go('wait');break;
   case 'bow':if(this.t>=.9)this.go('turn');break;
   case 'turn':if(this.t>=.5)this.walk('toDoor',[{x:578,y:884},{x:632,y:858},this.spots.door]);break;
   case 'toDoor':if(done){this.go('faceDoor',null,{dir:'N'});}break;
   case 'faceDoor':if(this.t>=.25)this.go('reach');break;
   case 'reach':if(this.t>=REACH_TIME)this.go('push');break;
   case 'push':{
    if(!this.authorized){this.go('wait');break;}
    const k=clamp(this.t/3.4);
    this.door=this.maxDoor*smooth(k);
    // Boots stay planted; only the upper body shifts its weight into the leaves.
    this.g.x=this.spots.door.x;this.g.y=this.spots.door.y;
    if(this.t>=PUSH_RELEASE){this.pushReleaseAt=this.t;this.go('releaseDoor');}
    break;
   }
   case 'releaseDoor':{
    // Once the palms would disappear behind the jambs, release the leaves.
    // Their existing momentum settles them open while he lowers his arms.
    const k=clamp((this.pushReleaseAt+this.t)/3.4);
    this.door=this.maxDoor*smooth(k);
    if(k>=1)this.walk('fromDoor',[{x:645,y:853},this.spots.near]);
    break;
   }
   case 'fromDoor':if(done)this.walk('aside',[this.spots.aside]);break;
   case 'aside':if(done)this.go('settle',null,{dir:'S'});break;
   case 'settle':if(this.t>=.25)this.go('welcome');break;
   case 'welcome':if(this.t>=1.5&&!this.ended){this.ended=true;this.onEnd();}break;
  }
  // Blend onto the actual panels before they move, then release continuously.
  // u is measured from the hinge: .46 is on the panel, away from the stone jamb.
  if(this.phase==='push'||(this.phase==='reach'&&this.t>=1/3)||(this.phase==='releaseDoor'&&this.t<HAND_RELEASE)){
   this.g.arms={L:this.leafPoint('L',this.door,.46,53),R:this.leafPoint('R',this.door,.46,79)};
   this.g.contact=this.phase==='reach'?smooth((this.t-1/3)/(REACH_TIME-1/3)):
    this.phase==='releaseDoor'?1-smooth(this.t/HAND_RELEASE):1;
  }else {this.g.arms=null;this.g.contact=0;}
  this.g.lean=this.phase==='push'?smooth(this.t/.65):this.phase==='releaseDoor'?1-smooth(this.t/.45):0;
 }
 get guardState(){return {...this.g,phase:this.phase,time:this.t,letter:this.letter,travelled:this.travelled};}
}

// Deliberate holds keep four-frame gestures legible without rapidly cycling them.
export function poseFor(g){
 const t=g.time||0;
 if(g.walk!=null)return {clip:'walk-'+g.dir,index:Math.floor(g.walk*8)%8};
 const once=(clip,rate=12,last=3)=>({clip,index:Math.min(last,Math.floor(t*rate))});
 switch(g.phase){
  case 'notice':case 'accepted':case 'bow':return once('nod',6);
  case 'offer':return once('offer-S',8,4);
  case 'hold':return {clip:'offer-S',index:4};
  case 'release':return {clip:'offer-S',index:Math.min(7,5+Math.floor(t*6))};
  case 'deny':return {clip:'refuse',index:t<.25?Math.min(2,Math.floor(t*12)):t<2.15?2:t<2.4?3:0};
  case 'puzzle':return {clip:'hesitate',index:t<.4?Math.floor(t*5):t<1.3?2:3};
  case 'pending':return {clip:'hesitate',index:1};
  case 'turn':return once('turn-S',8);
  case 'faceDoor':return {clip:'idle-N',index:0};
  case 'reach':return once('push-N',6,2);
  case 'push':return {clip:'push-N',index:2};
  case 'releaseDoor':return {clip:'push-N',index:t<HAND_RELEASE?2:t<.52?1:0};
  case 'settle':return {clip:'idle-S',index:0};
  case 'welcome':case 'enter':return once('welcome',8,2);
  default:return {clip:g.letter?'hold-S':'idle-S',index:Math.floor(t*3)%4};
 }
}
