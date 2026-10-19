// Runtime for the gate scene: one static art-resolution image of the whole place, plus a
// small "live patch" over the gateway that is recomposited when something moves there.
// The patch starts from the static colours and depths, then the door leaves and the youth
// are depth-tested against them, so jambs, steps and leaves hide him exactly where they
// should and his hands land on the wood.
import {Buf,iso,depthAt,GATE,drawDoors,doorLeafPoint,hex,mix} from './town-gate.js';
import {drawYouth,act,SPRITE_W,SPRITE_H,FOOT_X,FOOT_Y} from './ram-youth.js';
import {clamp} from './journey.js';

const SHADE=hex('#7a86b4'),WARM=hex('#f6dba6'),DUSK=hex('#2a2235');
const mul=(a,m)=>{const r=(a&255)*(m&255)/255,g=(a>>>8&255)*(m>>>8&255)/255,b=(a>>>16&255)*(m>>>16&255)/255;return (255<<24|b<<16|g<<8|r)>>>0;};
// The steps: (front edge Y, height). Above Y<GATE.front he stands on the gate floor.
export const STEPS=[[GATE.front+.38,6],[GATE.front+.76,4],[GATE.front+1.15,2]];
export function footZ(Y){if(Y<GATE.front)return GATE.floor;for(const [edge,h] of STEPS)if(Y<edge)return h;return 0;}

export function createGateWorld(baked){
 const {buf}=baked,lit=baked.lighting;
 const staticCanvas=document.createElement('canvas');staticCanvas.width=buf.w;staticCanvas.height=buf.h;
 staticCanvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf.col.buffer.slice(0)),buf.w,buf.h),0,0);
 // live patch bounds (art px, scene coordinates)
 const px0=-88,py0=-128,pw=176,ph=176;
 const patch=document.createElement('canvas');patch.width=pw;patch.height=ph;const pc=patch.getContext('2d'),img=pc.createImageData(pw,ph),out=new Uint32Array(img.data.buffer);
 const layer=new Buf(px0,py0,pw,ph);
 const sprite=new Uint32Array(SPRITE_W*SPRITE_H);
 let lastKey='';
 function render(st){
  // st: {door, youth:{X,Y,act,frame,side}|null, hands:{L,R}|null}
  const key=JSON.stringify(st);if(key===lastKey)return false;lastKey=key;
  // start from static
  for(let y=0;y<ph;y++){const sy=py0+y-buf.y0,so=sy*buf.w+(px0-buf.x0),lo=y*pw;for(let x=0;x<pw;x++){layer.col[lo+x]=buf.col[so+x];layer.dep[lo+x]=buf.dep[so+x];layer.tag[lo+x]=buf.tag[so+x];}}
  drawDoors(layer,st.door||0);
  // As the leaves swing in they turn away from the sun and the passage fills with daylight
  // from the courtyard beyond, so an open gate reads as open from this angle.
  const open=clamp((st.door||0)/1.2);
  if(open>0)for(let i=0;i<layer.col.length;i++){const t=layer.tag[i];
   if(t===2)layer.col[i]=mix(layer.col[i],WARM,.22*open);}
  // the door leaves are drawn in day colours; light them like the rest of the night scene
  if(lit)for(let i=0;i<layer.col.length;i++)if(layer.tag[i]===4){const x=i%pw+px0,y=(i/pw|0)+py0;layer.col[i]=lit.shade(layer.col[i],x,y,layer.dep[i],4);layer.tag[i]=0;}
  const yth=st.youth;
  if(yth){
   const fz=footZ(yth.Y),foot=iso(yth.X,yth.Y,fz),fd=depthAt(yth.X,yth.Y,fz)+.35;
   const pose={...act(yth.act,yth.frame),side:yth.side??1};
   if(st.hands){const rel=p=>{const s=iso(...p);return [s.x-foot.x,foot.y-s.y];};if(st.hands.L)pose.handL=rel(st.hands.L);if(st.hands.R)pose.handR=rel(st.hands.R);}
   if(yth.mirror)pose.side=-1;
   const cv=drawYouth(pose),d=cv.d;
   // contact shadow on whatever he stands on
   const fx=Math.round(foot.x),fy=Math.round(foot.y);
   for(let dy=-2;dy<=2;dy++)for(let dx=-7;dx<=7;dx++){if((dx/7.5)**2+(dy/2.4)**2>1)continue;const i=layer.i(fx+dx+1,fy+dy);if(i<0)continue;if(layer.dep[i]<fd-.2)layer.col[i]=mul(layer.col[i],SHADE);}
   for(let y=0;y<SPRITE_H;y++)for(let x=0;x<SPRITE_W;x++){const c=d[y*SPRITE_W+x];if(!c)continue;
    const sx=fx+x-FOOT_X,sy=fy+y-FOOT_Y,i=layer.i(sx,sy);if(i<0)continue;
    const dep=fd+(FOOT_Y-y)/8;if(dep>=layer.dep[i]){layer.col[i]=lit?lit.shade(c,sx,sy,fd-.35+(FOOT_Y-y)/8,7):c;layer.dep[i]=dep;}}
  }
  out.set(layer.col);pc.putImageData(img,0,0);return true;
 }
 // where the letter is when he holds it out (scene art px), for the hand-off flight
 function letterPoint(yth){const fz=footZ(yth.Y),foot=iso(yth.X,yth.Y,fz);return {x:foot.x+12.5,y:foot.y-24.6};}
 return {staticCanvas,x0:buf.x0,y0:buf.y0,patch,patchX:px0,patchY:py0,render,letterPoint,
  leaf:(s,angle,u,Z)=>doorLeafPoint(s,angle,u,Z)};
}
