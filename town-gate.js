// Sixth pass: the gate is built as a place in the town's own pixel language — a fixed
// 2:1 isometric view, one pixel size, one palette family, one light from the upper left.
// Everything is rasterised in software into an art-resolution buffer that keeps a depth
// value per pixel, so the youth, the door leaves and the letter are hidden correctly by
// jambs, posts and trees. No image files are needed for the scene.
import {random,clamp} from './journey.js';

export const HW=16,HH=8;                                   // half tile: 32×16 art px tiles
export const iso=(X,Y,Z=0)=>({x:(X-Y)*HW,y:(X+Y)*HH-Z});
export const depthAt=(X,Y,Z=0)=>X+Y+Z/HH;                   // larger = nearer the viewer
const isoV=(v)=>({x:(v[0]-v[1])*HW,y:(v[0]+v[1])*HH-v[2]});

// ---------- colour ----------
export const hex=h=>{const n=parseInt(h.slice(1),16);return (255<<24|(n&255)<<16|(n>>8&255)<<8|n>>16)>>>0;};
const R=c=>c&255,G=c=>c>>>8&255,B=c=>c>>>16&255;
const pack=(r,g,b,a=255)=>((a<<24)|(clamp(b|0,0,255)<<16)|(clamp(g|0,0,255)<<8)|clamp(r|0,0,255))>>>0;
export const mix=(a,b,t)=>pack(R(a)+(R(b)-R(a))*t,G(a)+(G(b)-G(a))*t,B(a)+(B(b)-B(a))*t);
const mul=(a,m)=>pack(R(a)*R(m)/255,G(a)*G(m)/255,B(a)*B(m)/255);
const ramp=list=>list.map(hex);
export const hash=(x,y,s=0)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^h>>>13,1274126177);return ((h^h>>>16)>>>0)/4294967296;};
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
export const fbm=(x,y,s,o=3)=>{let t=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){t+=a*vnoise(x*f,y*f,s+i*17);n+=a;f*=2;a*=.5}return t/n;};
const pick=(r,t)=>r[Math.max(0,Math.min(r.length-1,Math.round(t*(r.length-1))))];

// Palette: daylight greens and the pink sandstone / copper-green roofs of the old castle.
export const PAL={
 grass:ramp(['#2f5a32','#3c6e38','#4a823d','#5b9643','#6faa4c','#88bf58','#a4d168']),
 leaf:ramp(['#1b3527','#24462d','#305b33','#3e723a','#4f8a40','#66a249','#82b955','#a3cf67']),
 trunk:ramp(['#2e211d','#4a3226','#664531','#86603f','#a57c51']),
 pink:ramp(['#5c3743','#874f5d','#a96c77','#c78a90','#dea6a5','#efc1b8','#f9dcd0']),
 roof:ramp(['#16352d','#1f4a3a','#2a6248','#367b55','#4b9665','#6bb27b','#93cc95']),
 slate:ramp(['#262537','#353349','#46435c','#5a5672','#706c88']),
 cobble:ramp(['#3f3c48','#5f5b69','#7c7787','#98939f','#b3aeb7','#ccc8cd','#e2dfe1']),
 dirt:ramp(['#5a4634','#73593f','#8c6f4f','#a48660','#bb9d74']),
 wood:ramp(['#2a1a14','#41281c','#5b3926','#774c31','#93633f','#ad7d52']),
 iron:ramp(['#1a1a22','#2b2b36','#41414f','#5d5d6c']),
 gold:ramp(['#5e3d17','#8a5d22','#b5832f','#d8ab44','#f0d175','#fff0b0']),
 plaster:ramp(['#6f5b4c','#97806b','#b8a189','#d3c0a6','#e8dac4','#f6efe0']),
 water:ramp(['#244a73','#2f6091','#3d78aa','#5592c0','#79b0d4','#a9d0e6'])
};
const SHADOW=hex('#7a86b4'),SHADOW_DEEP=hex('#5c6592');
// Light from the upper left and slightly in front; shadows fall to the right.
const L=(()=>{const v=[-.62,.22,.75],n=Math.hypot(...v);return v.map(a=>a/n);})();
export const SHADOW_DIR=[.86,-.3];                         // ground direction of cast shadows
const SHADOW_LEN=.036;                                      // tiles of shadow per art px of height
const light=n=>{const d=n[0]*L[0]+n[1]*L[1]+n[2]*L[2];return clamp(.32+.68*Math.max(0,d));};
// Night: every lamp, lantern and lit window is registered as a warm point light while the
// scene is drawn; night-light.js then bakes their light into walls, paving and leaves.
export const LIGHTS=[];
const addLight=(X,Y,Z,i,r,kind)=>LIGHTS.push({X,Y,Z,i,r,kind});
export const GLASS={lit:hex('#ffe3a2'),mid:hex('#f3b968'),deep:hex('#c88745'),house:hex('#f3d27a'),house2:hex('#e9a956')};

// ---------- depth-tested buffers ----------
export class Buf{
 constructor(x0,y0,w,h){this.x0=Math.floor(x0);this.y0=Math.floor(y0);this.w=Math.ceil(w);this.h=Math.ceil(h);
  this.col=new Uint32Array(this.w*this.h);this.dep=new Float32Array(this.w*this.h).fill(-1e9);this.tag=new Uint8Array(this.w*this.h);}
 i(x,y){x=Math.floor(x)-this.x0;y=Math.floor(y)-this.y0;return x<0||y<0||x>=this.w||y>=this.h?-1:y*this.w+x;}
 put(x,y,d,c,tag=0){const i=this.i(x,y);if(i<0||!c||d<this.dep[i])return false;this.col[i]=c;this.dep[i]=d;this.tag[i]=tag;return true;}
 get(x,y){const i=this.i(x,y);return i<0?0:this.col[i];}
 // Selective outline: each transparent pixel touching the object takes a darker shade of
 // its neighbour, as hand-drawn sprites do; the outline sits at the neighbour's depth.
 outline(k=.55,skipTop=false){
  const {w,h,col,dep}=this,out=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(col[i])continue;
   let best=-1;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){if(skipTop&&dy===1)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const j=yy*w+xx;if(col[j]&&(best<0||dep[j]>dep[best]))best=j;}
   if(best>=0)out.push(i,best);}
  for(let k2=0;k2<out.length;k2+=2){const i=out[k2],j=out[k2+1];this.col[i]=mix(this.col[j],hex('#140f1c'),k);this.dep[i]=this.dep[j];this.tag[i]=this.tag[j];}
  return this;
 }
 merge(into,tag){for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){const i=y*this.w+x;if(this.col[i])into.put(x+this.x0,y+this.y0,this.dep[i],this.col[i],tag??this.tag[i]);}}
}

// ---------- primitives (world-space planes rasterised with an affine inverse) ----------
// tex(u,v,P,x,y) returns a colour or 0 (hole). O,A,B are world vectors [X,Y,Z].
export function quad(buf,O,A,B,tex,tag=0){
 const p0=iso(...O),a=isoV(A),b=isoV(B),det=a.x*b.y-a.y*b.x;if(Math.abs(det)<1e-6)return;
 const xs=[p0.x,p0.x+a.x,p0.x+b.x,p0.x+a.x+b.x],ys=[p0.y,p0.y+a.y,p0.y+b.y,p0.y+a.y+b.y];
 const x0=Math.floor(Math.min(...xs)),x1=Math.ceil(Math.max(...xs)),y0=Math.floor(Math.min(...ys)),y1=Math.ceil(Math.max(...ys));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const dx=x+.5-p0.x,dy=y+.5-p0.y,u=(dx*b.y-dy*b.x)/det,v=(a.x*dy-a.y*dx)/det;
  if(u<-1e-6||u>1+1e-6||v<-1e-6||v>1+1e-6)continue;
  const P=[O[0]+A[0]*u+B[0]*v,O[1]+A[1]*u+B[1]*v,O[2]+A[2]*u+B[2]*v];
  const c=tex(u,v,P,x,y);if(c)buf.put(x,y,depthAt(...P),c,tag);
 }
}
export function tri(buf,P0,P1,P2,tex,tag=0){
 const a=iso(...P0),b=iso(...P1),c=iso(...P2),det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(det)<1e-6)return;
 const x0=Math.floor(Math.min(a.x,b.x,c.x)),x1=Math.ceil(Math.max(a.x,b.x,c.x)),y0=Math.floor(Math.min(a.y,b.y,c.y)),y1=Math.ceil(Math.max(a.y,b.y,c.y));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const px=x+.5,py=y+.5,u=((px-a.x)*(c.y-a.y)-(c.x-a.x)*(py-a.y))/det,v=((b.x-a.x)*(py-a.y)-(px-a.x)*(b.y-a.y))/det;
  if(u<-1e-6||v<-1e-6||u+v>1+1e-6)continue;
  const P=[P0[0]+(P1[0]-P0[0])*u+(P2[0]-P0[0])*v,P0[1]+(P1[1]-P0[1])*u+(P2[1]-P0[1])*v,P0[2]+(P1[2]-P0[2])*u+(P2[2]-P0[2])*v];
  const col=tex(u,v,P,x,y);if(col)buf.put(x,y,depthAt(...P),col,tag);
 }
}
const normal=(A,B)=>{const n=[A[1]*B[2]-A[2]*B[1],A[2]*B[0]-A[0]*B[2],A[0]*B[1]-A[1]*B[0]],l=Math.hypot(...n)||1;return n.map(v=>v/l);};
// Box with only the three faces the camera can see (+X, +Y, top).
function box(buf,x0,y0,z0,x1,y1,z1,mat,tag=0){
 const sx=x1-x0,sy=y1-y0,sz=z1-z0;
 quad(buf,[x0,y1,z0],[sx,0,0],[0,0,sz],(u,v,P,x,y)=>mat(P,'front',light([0,1,0]),u,v,x,y),tag);
 quad(buf,[x1,y0,z0],[0,sy,0],[0,0,sz],(u,v,P,x,y)=>mat(P,'side',light([1,0,0]),u,v,x,y),tag);
 quad(buf,[x0,y0,z1],[sx,0,0],[0,sy,0],(u,v,P,x,y)=>mat(P,'top',light([0,0,1]),u,v,x,y),tag);
}
function cylinder(buf,cx,cy,r,z0,z1,mat,tag=0,seg=40){
 for(let i=0;i<seg;i++){
  const a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2,p0=[cx+Math.cos(a0)*r,cy+Math.sin(a0)*r,z0],p1=[cx+Math.cos(a1)*r,cy+Math.sin(a1)*r,z0];
  const am=(a0+a1)/2,n=[Math.cos(am),Math.sin(am),0];if(n[0]+n[1]<-.2)continue;
  quad(buf,p0,[p1[0]-p0[0],p1[1]-p0[1],0],[0,0,z1-z0],(u,v,P,x,y)=>mat(P,'round',light(n),(i+u)/seg,v,x,y,am),tag);
 }
}
function cone(buf,cx,cy,r,z0,h,mat,tag=0,seg=40){
 const apex=[cx,cy,z0+h];
 for(let i=0;i<seg;i++){
  const a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2,am=(a0+a1)/2;
  const n=normal([Math.cos(a1)*r-Math.cos(a0)*r,Math.sin(a1)*r-Math.sin(a0)*r,0],[-Math.cos(am)*r,-Math.sin(am)*r,h]).map(v=>-v);
  tri(buf,[cx+Math.cos(a0)*r,cy+Math.sin(a0)*r,z0],[cx+Math.cos(a1)*r,cy+Math.sin(a1)*r,z0],apex,(u,v,P,x,y)=>mat(P,'cone',light(n),(i+u)/seg,1-(P[2]-z0)/h,x,y,am),tag);
 }
}

// ---------- materials ----------
// Each returns a palette colour from (world point, face kind, light). Mortar and joints
// follow the faces' own coordinates so courses wrap round corners consistently.
function ashlar(P,kind,b,u,v,x,y){
 const r=PAL.pink;let along=kind==='front'?P[0]:kind==='side'?P[1]:0,z=P[2];
 if(kind==='top')return pick(r,.62+.25*b+(hash(Math.floor(P[0]*4),Math.floor(P[1]*4),5)-.5)*.12);
 const course=Math.floor(z/6),fz=z-course*6,bw=.62,off=course%2?bw/2:0,bi=Math.floor((along+off)/bw),fx=(along+off)/bw-bi;
 let t=.22+.6*b+(hash(bi,course,kind==='side'?7:3)-.5)*.16;
 if(fz<1)t-=.32;else if(fz<2&&fx>.04)t+=.08;
 if(fx<.035)t-=.28;else if(fx<.09)t+=.06;
 if(hash(x,y,11)<.04)t-=.08;
 return pick(r,t);
}
function plaster(P,kind,b,u,v,x,y){
 const r=PAL.plaster;let t=.25+.6*b+(fbm(P[0]*3+P[1]*3,P[2]*.1,4,2)-.5)*.12;if(hash(x,y,8)<.05)t-=.1;return pick(r,t);
}
function shingles(r,P,b,u,v,x,y,seed=0){
 const row=Math.floor(v*14),off=row%2?.5:0,col=Math.floor(u*28+off),fv=v*14-row,fu=u*28+off-col;
 let t=.2+.62*b+(hash(col,row,seed)-.5)*.14;if(fv>.78)t-=.25;if(fu<.08)t-=.12;return pick(r,t);
}

// ---------- the ground ----------
export function roadCentre(Y){return Y<1.6?0:.55*Math.sin((Y-1.6)*.33)-.15*Math.sin((Y-1.6)*.9);}
export const ROAD_HALF=1.15;
// A stone-lined water channel crosses the meadow and passes under the road on a small bridge.
export const channelY=X=>8.6+.35*Math.sin(X*.35);export const CH_HALF=.3;
export const WATER=new Set(PAL.water);
function cobble(X,Y,seed){
 // Jittered grid of rounded stones; returns {gap, shade, id}.
 const s=3.6,gx=X*s,gy=Y*s,ix=Math.floor(gx),iy=Math.floor(gy);let d1=9,d2=9,cx=0,cy=0,id=0;
 for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cxi=ix+i,cyi=iy+j,px=cxi+.2+.6*hash(cxi,cyi,seed),py=cyi+.2+.6*hash(cxi,cyi,seed+1),d=Math.hypot(gx-px,(gy-py)*1.05);
  if(d<d1){d2=d1;d1=d;cx=px;cy=py;id=cxi*131+cyi;}else if(d<d2)d2=d;}
 return {edge:d2-d1,dx:gx-cx,dy:gy-cy,id};
}
export function* bakeGround(buf,area,{ao}){
 const {X0,X1,Y0,Y1}=area,g=PAL.grass,c=PAL.cobble,dirt=PAL.dirt;
 for(let ys=Y0;ys<Y1;ys+=2){const ye=Math.min(Y1,ys+2);yield;
 quad(buf,[X0,ys,0],[X1-X0,0,0],[0,ye-ys,0],(u,v,P,x,y)=>{
  const X=P[0],Y=P[1];
  // inside the walls: a cobbled square
  if(Y<-1.6){const k=cobble(X,Y,9);let t=.55+(hash(k.id,0,3)-.5)*.2-(k.dx+k.dy)*.12;if(k.edge<.12)t=.12;return pick(c,t*.92);}
  const rc=roadCentre(Y),off=Math.abs(X-rc),edgeNoise=(fbm(Y*1.7,X*.5,13,2)-.5)*.45;
  const cd=Math.abs(Y-channelY(X));
  if(cd<CH_HALF+.13&&off>ROAD_HALF+.22){if(cd<CH_HALF){const w=fbm(X*2.2,Y*6,91,2);return pick(PAL.water,.18+w*.35+(hash(x,y>>1,4)<.05?.25:0));}return pick(PAL.cobble,.32+(hash(Math.floor(X*4),Math.floor(Y*9),5)-.5)*.16);}
  // Worn earth margin, then the cobbles; near the gate the paving is complete.
  const half=ROAD_HALF+edgeNoise*(Y>2?1:.2);
  if(Y>-1.6&&Y<2.3&&Math.abs(X)<2.6-Math.max(0,Y-1.7)*1.2){const k=cobble(X,Y,4);let t=.6+(hash(k.id,1,3)-.5)*.2-(k.dx*.7+k.dy*.7)*.18;if(k.edge<.11)t=.1;return pick(c,t);}
  if(off<half){
   const k=cobble(X,Y,4),sparse=off>half-.35&&hash(k.id,7,2)<.5;
   if(!sparse&&k.edge>.1){let t=.58+(hash(k.id,1,3)-.5)*.22-(k.dx*.7+k.dy*.7)*.2;if(k.edge<.17)t-=.1;return pick(c,t);}
   return pick(dirt,.45+(hash(x,y,2)-.5)*.3);
  }
  if(off<half+.22)return pick(dirt,.55+(hash(x>>1,y,5)-.5)*.3);
  // Grass: broad tonal patches, short blade marks, and the odd darker clump.
  const patch=fbm(X*.45,Y*.45,21,3),blade=hash(x,y>>1,7);
  let t=.42+(patch-.5)*.55;
  if(blade<.06)t+=.18;else if(blade>.93)t-=.16;
  if(hash(x>>1,y>>1,31)<.02)t-=.25;
  if(ao){const o=ao(X,Y);t-=o;}
  return pick(g,t);
 },1);}
}
// Flower specks and grass tufts over the meadow, kept off the road.
function meadowDetails(buf,area,r){
 const {X0,X1,Y0,Y1}=area;
 for(let k=0;k<2600;k++){
  const X=X0+r()*(X1-X0),Y=Math.max(-1,Y0)+r()*(Y1-Math.max(-1,Y0));if(Math.abs(X-roadCentre(Y))<ROAD_HALF+.4||(Y<1.7&&Math.abs(X)<2.4)||Math.abs(Y-channelY(X))<CH_HALF+.25)continue;
  const p=iso(X,Y),x=Math.round(p.x),y=Math.round(p.y),d=depthAt(X,Y)+.001,cluster=fbm(X*.6,Y*.6,77,2);
  if(cluster>.62&&r()<.5){const fc=[hex('#fff4e6'),hex('#f6d36b'),hex('#f29abb'),hex('#c6a4ef')][Math.floor(hash(Math.floor(X*.5),Math.floor(Y*.5),3)*4)];
   buf.put(x,y,d,fc,1);buf.put(x+1,y,d,mix(fc,hex('#000000'),.15),1);buf.put(x,y+1,d,PAL.grass[1],1);}
  else if(r()<.35){const t=PAL.grass;buf.put(x,y,d,t[1],1);buf.put(x,y-1,d,t[4],1);buf.put(x+1,y-2,d,t[5],1);buf.put(x-1,y-1,d,t[3],1);}
 }
}

// ---------- shadows cast on the ground ----------
// A ground point is shadowed if walking back toward the sun at some height up to the
// caster's top lands inside the caster.
function shadowPass(buf,casters){
 // Bucket casters by the ground cells their shadow can reach, so each pixel only tests
 // the few that matter.
 const cell=2,grid=new Map(),key=(i,j)=>i*1000+j;
 for(const c of casters){
  const len=c.h*SHADOW_LEN,ex=SHADOW_DIR[0]*len,ey=SHADOW_DIR[1]*len;
  const bx0=c.kind==='box'?c.x0:c.cx-c.r,bx1=c.kind==='box'?c.x1:c.cx+c.r,by0=c.kind==='box'?c.y0:c.cy-c.r,by1=c.kind==='box'?c.y1:c.cy+c.r;
  for(let i=Math.floor((Math.min(bx0,bx0+ex))/cell);i<=Math.floor(Math.max(bx1,bx1+ex)/cell);i++)for(let j=Math.floor(Math.min(by0,by0+ey)/cell);j<=Math.floor(Math.max(by1,by1+ey)/cell);j++){const k=key(i,j);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(c);}
 }
 for(let i=0;i<buf.col.length;i++){
  if(buf.tag[i]!==1)continue;
  const x=i%buf.w+buf.x0+.5,y=(i/buf.w|0)+buf.y0+.5;
  const X=(x/HW+y/HH)/2,Y=(y/HH-x/HW)/2,list=grid.get(key(Math.floor(X/cell),Math.floor(Y/cell)));if(!list)continue;let s=0;
  for(const c of list){
   if(c.kind==='box'){const t0=0,t1=c.h;
    // segment from (X,Y) back along -SHADOW_DIR for lengths 0..h*SHADOW_LEN
    const len=t1*SHADOW_LEN,dx=-SHADOW_DIR[0]*len,dy=-SHADOW_DIR[1]*len;
    let lo=0,hi=1;for(const [p,d,a,b] of [[X,dx,c.x0,c.x1],[Y,dy,c.y0,c.y1]]){if(Math.abs(d)<1e-9){if(p<a||p>b){lo=2;break}continue}let ta=(a-p)/d,tb=(b-p)/d;if(ta>tb)[ta,tb]=[tb,ta];lo=Math.max(lo,ta);hi=Math.min(hi,tb);}
    if(lo<=hi&&hi>=0&&lo<=1)s=Math.max(s,c.dark??1);
   }else{
    // round casters (towers, crowns): the shadow is the disc swept along the light
    const zc=c.z??0,len0=zc*SHADOW_LEN,len1=(c.h)*SHADOW_LEN,ax=c.cx+SHADOW_DIR[0]*len0,ay=c.cy+SHADOW_DIR[1]*len0,bx=c.cx+SHADOW_DIR[0]*len1,by=c.cy+SHADOW_DIR[1]*len1;
    const vx=bx-ax,vy=by-ay,t=clamp(((X-ax)*vx+(Y-ay)*vy)/(vx*vx+vy*vy||1)),qx=ax+vx*t-X,qy=ay+vy*t-Y;
    const rr=c.r*(c.taper?1-.3*t:1);
    if(qx*qx+qy*qy<rr*rr){const edge=Math.sqrt(qx*qx+qy*qy)/rr;s=Math.max(s,(c.dark??1)*(edge>.85&&hash(i,0,3)<.5?.6:1));}
   }
   if(s>=1)break;
  }
  if(s>0)buf.col[i]=mul(buf.col[i],s>=1?SHADOW:mix(hex('#ffffff'),SHADOW,s));
 }
}

// ---------- plants ----------
// Crown made of leaf puffs drawn top-first so lower puffs overlap upper ones; each puff is
// lit from the upper left with a dark lower rim, and carries a small leaf texture.
function crown(buf,cx,cy,depth,rad,seed,{squash=1,dense=1,haze=0}={}){
 const r=random(seed),puffs=[],L2=PAL.leaf;
 const n=Math.round(7+rad*rad*.055*dense);
 for(let k=0;k<n;k++){const a=r()*Math.PI*2,q=Math.sqrt(r())*.78;puffs.push({x:cx+Math.cos(a)*q*rad,y:cy+Math.sin(a)*q*rad*.82*squash,r:rad*(.3+r()*.16)});}
 puffs.push({x:cx,y:cy-rad*.2,r:rad*.5});
 puffs.sort((a,b)=>a.y-b.y);
 for(const p of puffs){
  const pr=p.r;
  for(let y=Math.floor(p.y-pr);y<=p.y+pr;y++)for(let x=Math.floor(p.x-pr*1.05);x<=p.x+pr*1.05;x++){
   const dx=(x+.5-p.x)/pr,dy=(y+.5-p.y)/pr,d=Math.hypot(dx*.95,dy);
   const wob=.9+.12*vnoise(Math.atan2(dy,dx)*2.5+p.x,p.y,seed);if(d>wob)continue;
   // whole-crown light plus puff light
   const gl=(-(x-cx)*.6-(y-cy)*.8)/rad,lt=(-dx*.55-dy*.85);
   let t=.42+gl*.28+lt*.22;
   if(d>wob-.16&&dx+dy>-.1)t-=.22;                       // shaded lower-right rim
   const leaf=hash(x>>1,y,seed)+hash(x,y>>1,seed+3)*.5;
   if(leaf>1.25)t+=.14;else if(leaf<.22)t-=.12;
   buf.put(x,y,depth+(cy-y)*0/HH,pick(L2,haze?t*.9+haze*.1:t),3);
  }
 }
}
export function tree(buf,X,Y,size,seed,{kind='oak'}={}){
 const t=new Buf(iso(X,Y).x-size*1.4,iso(X,Y).y-size*2.6,size*2.8,size*2.8),p=iso(X,Y),base=depthAt(X,Y);
 const r=random(seed),tr=PAL.trunk,trunkH=size*(kind==='oak'?.95:.7),tw=Math.max(3,Math.round(size*.22));
 // billboard depth: rows higher up are slightly nearer (so they cover what stands behind)
 const dAt=y=>base+(p.y-y)/HH*.5;
 for(let y=Math.round(p.y-trunkH);y<=p.y;y++){
  const flare=y>p.y-3?(3-(p.y-y))*.8:0;
  for(let x=Math.round(p.x-tw/2-flare);x<=p.x+tw/2+flare;x++){const f=(x-(p.x-tw/2-flare))/(tw+2*flare);
   let k=f<.3?.75:f<.7?.5:.25;if(hash(x,y>>1,seed)<.18)k-=.2;t.put(x,y,dAt(y),pick(tr,k));}
 }
 if(kind==='pine'){
  const h=size*2.1,tiers=5;
  for(let k=0;k<tiers;k++){const top=p.y-trunkH*.45-h*(1-k/tiers),bot=top+h*.32,half=size*(.35+.65*(k+1)/tiers);
   for(let y=Math.round(top);y<=bot;y++){const f=(y-top)/(bot-top),w=half*(.25+.75*f);
    for(let x=Math.round(p.x-w);x<=p.x+w;x++){const lx=(x-p.x)/w;let tt=.55-lx*.3-(f>.8?.25:0)+(hash(x,y,seed)<.15?.12:0);t.put(x,y,dAt(y),pick(PAL.leaf,tt*.8),3);}}}
 }else{
  if(kind==='oak'){for(const s of [-1,1]){let bx=p.x,by=p.y-trunkH*.7;for(let k=0;k<size*.35;k++){bx+=s*.8;by-=.6;t.put(Math.round(bx),Math.round(by),dAt(by),tr[2]);t.put(Math.round(bx),Math.round(by)+1,dAt(by),tr[1]);}}}
  crown(t,p.x+(r()-.5)*2,p.y-trunkH-size*.55,base+.2,size*(kind==='oak'?1.1:.85),seed);
 }
 t.outline(.62).merge(buf);
 return {kind:'round',cx:X+.15,cy:Y-.15,r:size*.042,z:trunkH*.6,h:trunkH+size*1.2,dark:1,taper:true};
}
function bush(buf,X,Y,size,seed,flowers=0){
 const p=iso(X,Y),t=new Buf(p.x-size*1.6,p.y-size*1.8,size*3.2,size*2.2),d=depthAt(X,Y)+.05;
 crown(t,p.x,p.y-size*.55,d,size*.9,seed,{squash:.7,dense:1.4});
 if(flowers){const r=random(seed+5),fc=[hex('#ffe9f1'),hex('#f29abb'),hex('#ffffff'),hex('#f4cf62')][flowers-1];
  for(let k=0;k<size*1.3;k++){const x=Math.round(p.x+(r()-.5)*size*1.5),y=Math.round(p.y-size*.55+(r()-.6)*size*.9);if(t.get(x,y)){t.put(x,y,d+1,fc,3);t.put(x+1,y,d+1,mix(fc,PAL.leaf[2],.4),3);}}}
 t.outline(.6).merge(buf);
 return {kind:'round',cx:X+.08,cy:Y-.05,r:size*.045,z:0,h:size*.9,dark:.8};
}
function rock(buf,X,Y,s,seed){
 const p=iso(X,Y),t=new Buf(p.x-s*2,p.y-s*2,s*4,s*3),d=depthAt(X,Y);
 for(let y=Math.floor(p.y-s);y<=p.y+1;y++)for(let x=Math.floor(p.x-s*1.4);x<=p.x+s*1.4;x++){const dx=(x+.5-p.x)/(s*1.4),dy=(y+.5-p.y+s*.3)/(s*1.1);if(dx*dx+dy*dy>1||y>p.y+1)continue;
  t.put(x,y,d,pick(PAL.cobble,.55-dx*.25-dy*.3+(hash(x,y,seed)-.5)*.1));}
 t.outline(.55).merge(buf);
}
// Iron lamp post with a small lantern; lit glass is a warm yellow even by day.
function lampPost(buf,X,Y){
 const p=iso(X,Y),t=new Buf(p.x-8,p.y-48,16,52),d=depthAt(X,Y),dAt=y=>d+(p.y-y)/HH*.3,ir=PAL.iron;
 for(let y=p.y-38;y<=p.y;y++){t.put(p.x,y,dAt(y),ir[2]);t.put(p.x+1,y,dAt(y),ir[1]);}
 for(let x=-2;x<=3;x++){t.put(p.x+x,p.y,dAt(p.y),ir[1]);t.put(p.x+x,p.y-1,dAt(p.y),ir[2]);}
 const ly=p.y-44;
 for(let y=ly;y<ly+8;y++)for(let x=-3;x<=4;x++){const edge=x===-3||x===4||y===ly||y===ly+7;t.put(p.x+x,y,dAt(y),edge?ir[1]:(x<1?hex('#ffe9a6'):hex('#f5c45a')));}
 for(let x=-4;x<=5;x++)t.put(p.x+x,ly-1,dAt(ly),ir[2]);for(let x=-2;x<=3;x++)t.put(p.x+x,ly-2,dAt(ly),ir[3]);t.put(p.x,ly-3,dAt(ly),ir[2]);t.put(p.x+1,ly-3,dAt(ly),ir[2]);
 t.outline(.5).merge(buf);
addLight(X,Y,44,1.35,3.9,'lamp');
 return {kind:'round',cx:X,cy:Y,r:.05,z:0,h:44,dark:.7};
}
// Low split-rail fence along the meadow, posts every tile.
function fence(buf,X0,Y0,X1,Y1){
 const n=Math.max(1,Math.round(Math.hypot(X1-X0,Y1-Y0)/.8)),w=PAL.wood,t=new Buf(Math.min(iso(X0,Y0).x,iso(X1,Y1).x)-6,Math.min(iso(X0,Y0).y,iso(X1,Y1).y)-22,Math.abs(iso(X1,Y1).x-iso(X0,Y0).x)+12,Math.abs(iso(X1,Y1).y-iso(X0,Y0).y)+28);
 for(let k=0;k<=n;k++){const X=X0+(X1-X0)*k/n,Y=Y0+(Y1-Y0)*k/n,p=iso(X,Y),d=depthAt(X,Y);
  for(let y=p.y-14;y<=p.y;y++){t.put(p.x,y,d+.01,w[4]);t.put(p.x+1,y,d+.01,w[2]);}t.put(p.x,p.y-15,d+.01,w[5]);t.put(p.x+1,p.y-15,d+.01,w[3]);}
 for(const zz of [5,10])quad(t,[X0,Y0,zz],[X1-X0,Y1-Y0,0],[0,0,2],(u,v)=>pick(w,v>.5?.75:.45));
 t.outline(.55).merge(buf);
}

// ---------- buildings ----------
// Small town houses behind the wall: plaster and timber, slate or green-copper roofs.
function house(buf,x0,y0,x1,y1,h,roofH,seed,roofMat=PAL.slate){
 const t=new Buf(iso(x0,y1).x-4,iso(x0,y0).y-h-roofH-10,(x1-x0+y1-y0)*HW+8,(x1-x0+y1-y0)*HH+h+roofH+16);
 box(t,x0,y0,0,x1,y1,h,(P,kind,b,u,v,x,y)=>{
  // timber frame: posts at corners and the middle, a beam under the eaves
  const along=kind==='front'?u:v,span=kind==='front'?x1-x0:y1-y0;
  if(along*span<.08||along*span>span-.08||Math.abs(along-.5)*span<.05||P[2]>h-3)return pick(PAL.wood,.25+.5*b);
  const wx=(along*span*1.6)%1,wz=P[2]/h;
  if(wz>.45&&wz<.75&&wx>.3&&wx<.7){return wz<.5||wx<.36||wx>.64?pick(PAL.wood,.4):(hash(Math.floor(along*span*1.6),seed,1)<.5?(wz>.66?GLASS.house2:GLASS.house):pick(PAL.slate,.3+.4*b));}
  return plaster(P,kind,b,u,v,x,y);
 });
 // the same windows, as lights (front face along X, side face along Y)
 for(const [span,face] of [[x1-x0,'front'],[y1-y0,'side']])for(let k=0;k<span*1.6;k++){const along=(k+.5)/1.6;if(along>span-.1||hash(k,seed,1)>=.5)continue;
  if(face==='front')addLight(x0+along,y1+.15,h*.6,.42,1.25,'window');else addLight(x1+.15,y0+along,h*.6,.42,1.25,'window');}
 // gable roof running along X, eaves overhanging the walls
 const ov=.12,mid=(y0+y1)/2;
 quad(t,[x0-ov,y1+ov,h],[x1-x0+2*ov,0,0],[0,mid-y1-ov,roofH],(u,v,P,x,y)=>shingles(roofMat,P,light(normal([1,0,0],[0,mid-y1-ov,roofH]).map(v2=>-v2)),u,v,x,y,seed));
 tri(t,[x1,y1,h],[x1,y0,h],[x1,mid,h+roofH],(u,v,P,x,y)=>plaster(P,'side',light([1,0,0]),u,v,x,y));
 quad(t,[x0-ov,mid,h+roofH],[x1-x0+2*ov,0,0],[0,y0-mid-ov,-roofH],(u,v,P,x,y)=>shingles(roofMat,P,light([0,-.6,.8]),u,v,x,y,seed+1));
 // chimney
 box(t,x0+.3,mid-.15,h+roofH*.5,x0+.6,mid+.15,h+roofH+6,ashlar);
 t.outline(.6).merge(buf);
 return {kind:'box',x0,x1,y0,y1,h:h+roofH*.6,dark:1};
}

// The gate: curtain wall, two round towers, a tall gatehouse with a recessed arched
// gateway and a real passage behind it, a clock tower, bartizans, banners, lanterns,
// climbing roses, and broad steps down to the road.
export const GATE={half:1.2,height:72,doorY:-.15,front:.6,passageBack:-2.1,floor:6};
GATE.spring=GATE.height-GATE.half*16;
const archAt=(X,Z)=>{const a=GATE.half;return Math.abs(X)<a&&(Z<GATE.spring||Math.hypot(X/a,(Z-GATE.spring)/(a*16))<1);};
const ivy=(P,kind,col,seed,amt=.62)=>{
 // roses and ivy climb from the wall foot and hang from the parapet in irregular sheets
 const along=kind==='front'?P[0]:P[1],z=P[2],n=fbm(along*1.6,z*.045,seed,3),foot=clamp(1-z/34)*.18;
 if(n+foot<amt)return col;
 const lt=hash(Math.round(along*16),Math.round(z),seed),edge=n+foot<amt+.04;
 if(lt<.045)return lt<.02?hex('#f7a8c4'):hex('#d9628f');
 return pick(PAL.leaf,(edge?.2:.35)+(lt>.7?.25:0)+(kind==='side'?-.12:0));
};
function window2(P,kind,b,cx,z0,w,h,along,lit=false){
 // arched lancet with leaded panes; returns 0 if outside. Lit ones glow from within.
 const dx=(along-cx)/w,dz=(P[2]-z0)/h;if(Math.abs(dx)>1.25||dz<-.12||dz>1.18)return 0;
 if(lit&&(dz<.7?Math.abs(dx)<1:Math.hypot(dx,(dz-.7)/.4)<1)){if(Math.abs(dx)<.12||Math.abs(dz-.42)<.05)return pick(PAL.iron,.3);return dz>.75?GLASS.deep:(dx<-.2?GLASS.lit:GLASS.mid);}
 const inArch=dz<.7?Math.abs(dx)<1:Math.hypot(dx,(dz-.7)/.4)<1;
 const frame=dz<.7?Math.abs(dx)<1.25:Math.hypot(dx/1.25,(dz-.7)/.5)<1;
 if(inArch){if(Math.abs(dx)<.12||Math.abs(dz-.42)<.05)return pick(PAL.iron,.4);return dz>.75?hex('#3f4f72'):(dx<-.3&&dz>.15?hex('#7d93b8'):hex('#2d3756'));}
 if(frame||(dz<0&&dz>-.12))return pick(PAL.pink,.7+.25*b);
 return 0;
}
function gatehouse(buf,casters){
 const W=new Buf(-520,-380,1040,600),G=GATE,a=G.half;
 // curtain walls with crenellation and a walkway lip
 const wallH=52;
 for(const [x0,x1] of [[-24,-5.4],[5.4,24]]){
  box(W,x0,-1,0,x1,0,wallH,(P,kind,b,u,v,x,y)=>{const c=ashlar(P,kind,b,u,v,x,y);if(kind==='top')return c;return ivy(P,kind,P[2]<4?mul(c,hex('#c9c3d3')):c,x0<0?5:6,.66);});
  box(W,x0,-.12,wallH-4,x1,.12,wallH-1,(P,kind,b)=>pick(PAL.pink,.4+.4*b));
  for(let X=x0;X<x1-.01;X+=.55)box(W,X,-.25,wallH,Math.min(X+.33,x1),0,wallH+7,ashlar);
  casters.push({kind:'box',x0,x1,y0:-1,y1:0,h:wallH+4});
 }
 // round towers with lancet windows, a corbelled rim and copper cone roofs
 for(const s of [-1,1]){const cx=s*4.55,cy=-.45,r=1.55,h=118;
  const mat=(P,kind,b,u,v,x,y,am)=>{
   const z=P[2],course=Math.floor(z/6),fz=z-course*6,around=am*r*1.6+(course%2?.31:0),bi=Math.floor(around/.62),fx=around/.62-bi;
   for(const [z0,hh,w,lit] of [[40,16,.17,s<0],[78,18,.19,true]]){const c=window2(P,kind,b,Math.PI/4+.05*s,z0,w,hh,am,lit);if(c)return c;}
   let t=.18+.62*b+(hash(bi,course,s+9)-.5)*.14;if(fz<1)t-=.3;if(fx<.05)t-=.24;
   return ivy([am*r,am*r,z],'front',pick(PAL.pink,t),s+20,.7);
  };
  cylinder(W,cx,cy,r,0,h,mat);
  cylinder(W,cx,cy,r+.18,h-8,h,(P,k,b,u,v,x,y,am)=>{const m=Math.floor(am*r*4)%2;return pick(PAL.pink,(m?.42:.6)+.3*b-(v<.25?.3:0));});
  for(let k=0;k<12;k++){const am=k/12*Math.PI*2;if(Math.cos(am-Math.PI/4)<-.3)continue;box(W,cx+Math.cos(am)*(r+.05)-.12,cy+Math.sin(am)*(r+.05)-.12,h,cx+Math.cos(am)*(r+.05)+.12,cy+Math.sin(am)*(r+.05)+.12,h+6,ashlar);}
  cone(W,cx,cy,r+.38,h+2,66,(P,k,b,u,v,x,y,am)=>{const row=Math.floor(v*18),fu=(u*48+(row%2?.5:0))%1;let t=.12+.72*b+(hash(Math.floor(u*48),row,3)-.5)*.12;if((v*18)%1<.22)t-=.22;if(fu<.08)t-=.1;if(v>.92)t-=.2;return pick(PAL.roof,t);});
  const ap=iso(cx,cy,h+68);for(let y=ap.y-9;y<ap.y+2;y++){W.put(ap.x,y,depthAt(cx,cy,h+68)+1,PAL.gold[3]);}W.put(ap.x,ap.y-10,depthAt(cx,cy,h+70)+1,PAL.gold[5]);
  for(let k=0;k<8;k++)for(let j=0;j<Math.max(1,4-k*.4);j++)W.put(ap.x+1+k,ap.y-9+j+Math.round(Math.sin(k*.8+s)),depthAt(cx,cy,h+68)+1,j<1?hex('#f6a3c0'):hex('#d9628f'));
  casters.push({kind:'round',cx,cy,r:r+.12,z:0,h:h+40});
 }
 // gatehouse block
 const gx0=-3.05,gx1=3.05,gy0=-2.1,gy1=G.front,gh=102;
 box(W,gx0,gy0,0,gx1,gy1,gh,(P,kind,b,u,v,x,y)=>{
  if(kind==='front'){
   if(archAt(P[0],P[2]))return 0;
   const sp=G.spring,dd=P[2]>sp?Math.hypot(P[0]/a,(P[2]-sp)/(a*16)):Math.abs(P[0])/a;
   if(dd<1.2&&P[2]<sp+a*16*1.22){const seg=Math.floor(Math.atan2(Math.max(0,P[2]-sp),P[0])*8);const key=P[2]>sp?seg:Math.floor(P[2]/7);
    return pick(PAL.pink,(key%2?.58:.74)*(.6+.4*b)+(dd>1.15?-.28:0)+(P[2]>sp+a*16*.97&&Math.abs(P[0])<.14?.2:0));}
   if(P[2]>84&&P[2]<88)return pick(PAL.pink,.86*b+.08);              // string course
   if(P[2]>88&&P[2]<92)return pick(PAL.pink,.35);
   for(const wx of [-2.15,2.15]){const c=window2(P,kind,b,wx,58,.28,18,P[0],wx>0);if(c)return c;}
   const c=ashlar(P,kind,b,u,v,x,y);return ivy(P,kind,c,7,.7);
  }
  if(kind==='side'){for(const wy of [-.8]){const c=window2(P,kind,b,wy,58,.26,18,P[1],true);if(c)return c;}}
  return ashlar(P,kind,b,u,v,x,y);
 });
 for(let X=gx0;X<gx1-.01;X+=.58)box(W,X,G.front-.32,gh,Math.min(X+.34,gx1),G.front,gh+8,ashlar);
 for(let Y=gy0;Y<G.front-.01;Y+=.58)box(W,gx1-.32,Y,gh,gx1,Math.min(Y+.34,G.front),gh+8,ashlar);
 casters.push({kind:'box',x0:gx0,x1:gx1,y0:gy0,y1:gy1,h:gh});
 // bartizans: small corbelled turrets on the two front corners
 for(const s of [-1,1]){const cx=s*(gx1-.05),cy=G.front-.05,r=.5;
  cone(W,cx,cy,r*.95,gh-16,16,(P,k,b,u,v)=>pick(PAL.pink,.25+.5*b-(v>.8?.2:0)));
  cylinder(W,cx,cy,r,gh,gh+24,(P,kind,b,u,v,x,y,am)=>{const z=P[2];if(Math.abs(am-Math.PI/4)<.25&&z>gh+8&&z<gh+17)return hex('#2a2235');return pick(PAL.pink,.2+.62*b+((Math.floor(z/5))%2?.04:0)-(z%5<1?.2:0));});
  cone(W,cx,cy,r+.16,gh+24,30,(P,k,b,u,v)=>{const row=Math.floor(v*10);let t=.14+.7*b+(hash(Math.floor(u*28),row,9)-.5)*.1;if((v*10)%1<.22)t-=.2;return pick(PAL.roof,t);});
 }
 // gateway interior: jamb returns, barrel vault, passage floor, far arch onto the town
 quad(W,[-a,G.front,0],[0,G.passageBack-G.front,0],[0,0,G.spring],(u,v,P)=>pick(PAL.pink,.36+.22*(1-u)-(hash(Math.floor(P[1]*5),Math.floor(P[2]/7),2)<.3?.06:0)-(Math.floor(P[2]/7)%2?0:.03)),2);
 for(let k=0;k<16;k++){const t0=k/16*Math.PI,t1=(k+1)/16*Math.PI;
  quad(W,[-Math.cos(t0)*a,G.front,G.spring+Math.sin(t0)*a*16],[0,G.passageBack-G.front,0],[-Math.cos(t1)*a+Math.cos(t0)*a,0,Math.sin(t1)*a*16-Math.sin(t0)*a*16],(u,v,P)=>pick(PAL.pink,.06+.12*(1-u)*(k<8?1:.5)),2);}
 quad(W,[-a,G.passageBack,G.floor],[2*a,0,0],[0,G.front-G.passageBack,0],(u,v,P,x,y)=>{const lit=clamp(1-v*1.5)*(1-Math.abs(P[0])/a*.5);const k=cobble(P[0],P[1],12);return pick(PAL.cobble,(k.edge<.12?.04:.2)+lit*.5);},2);
 // the far opening: a sunlit square with a fountain rim, a house front and sky
 quad(W,[-a,G.passageBack,0],[2*a,0,0],[0,0,G.height],(u,v,P,x,y)=>{
  if(!archAt(P[0],P[2]))return pick(PAL.pink,.12);
  const z=P[2]-G.floor;if(z<0)return 0;if(z<8)return pick(PAL.cobble,.8+(hash(x>>1,y,1)-.5)*.1);if(z<13)return pick(PAL.pink,.65+(Math.floor(P[0]*3)%2?.08:0));
  if(z<44)return (Math.abs(P[0]+.3)<.18&&z>20&&z<32)?hex('#4c5c84'):pick(PAL.plaster,.82+(hash(Math.floor(P[0]*7),Math.floor(z/6),4)-.5)*.1);
  if(z<54)return pick(PAL.slate,.5+(Math.floor(z/3)%2?.08:0));return hex('#bde0f4');},2);
 // clock tower
 const tx0=-1.35,tx1=1.35,ty0=-1.7,ty1=-.15,tz0=gh,tz1=gh+50;
 box(W,tx0,ty0,tz0,tx1,ty1,tz1,(P,kind,b,u,v,x,y)=>{
  if(kind==='front'){const cz=tz0+28,dx=P[0],dz=(P[2]-cz)/16*1.2,r2=Math.hypot(dx,dz);
   if(r2<.86){if(r2>.72)return pick(PAL.gold,.5+.45*b+(Math.floor(Math.atan2(dz,dx)*6)%2?.08:0));
    const ang=Math.atan2(dz,dx),near=Math.abs(Math.round(ang/(Math.PI/6))*Math.PI/6-ang);if(r2>.58&&near<.07)return hex('#3a2f3c');
    const hand=(t,len,wd)=>{const ha=Math.PI/2-t*Math.PI*2,px=Math.cos(ha),pz=Math.sin(ha),proj=dx*px+dz*pz,perp=Math.abs(dx*pz-dz*px);return proj>-.05&&proj<len&&perp<wd;};
    if(hand(.13,.48,.05)||hand(.62,.34,.07))return hex('#2a2230');return r2<.09?pick(PAL.gold,.8):(dx<-.2&&dz>.2?hex('#fffaf0'):hex('#f2e8d2'));}
   if(P[2]>tz1-6)return pick(PAL.pink,.85*b);
  }
  if(kind==='side'){const c=window2(P,kind,b,(ty0+ty1)/2,tz0+16,.24,20,P[1],true);if(c)return c;}
  return ashlar(P,kind,b,u,v,x,y);
 });
 const apex=[0,(ty0+ty1)/2,tz1+54],ov=.24,c4=[[tx0-ov,ty1+ov],[tx1+ov,ty1+ov],[tx1+ov,ty0-ov],[tx0-ov,ty0-ov]];
 for(let k=0;k<4;k++){const p0=[...c4[k],tz1],p1=[...c4[(k+1)%4],tz1],n=normal([p1[0]-p0[0],p1[1]-p0[1],0],[apex[0]-p0[0],apex[1]-p0[1],apex[2]-tz1]).map(v=>-v);
  tri(W,p0,p1,apex,(u,v,P,x,y)=>shingles(PAL.roof,P,light(n),u+v*.5,1-(P[2]-tz1)/54,x,y,k));}
 // dormer clock-bell openings in the roof are suggested by a gold ridge band
 casters.push({kind:'box',x0:tx0,x1:tx1,y0:ty0,y1:ty1,h:tz1+24});
 const fp=iso(...apex),fd=depthAt(...apex)+1;for(let y=fp.y-12;y<fp.y+1;y++)W.put(fp.x,y,fd,PAL.gold[3]);W.put(fp.x-1,fp.y-6,fd,PAL.gold[4]);W.put(fp.x+1,fp.y-6,fd,PAL.gold[2]);
 for(let k=0;k<11;k++)for(let j=0;j<Math.max(1,6-k*.5);j++)W.put(fp.x+1+k,fp.y-12+j+Math.round(Math.sin(k*.7)*1.2),fd,k<1?PAL.gold[4]:j<1?hex('#f8b2c9'):hex('#d9628f'));
 // banners and lanterns
 for(const s of [-1,1]){const bx=s*2.15;quad(W,[bx-.34,G.front+.03,24],[.68,0,0],[0,0,30],(u,v,P,x,y)=>{
   if(v<.12&&Math.abs(u-.5)>.5-.5*v/.12)return 0;
   if(u<.09||u>.91||v>.92)return pick(PAL.gold,.55+.3*(1-u));const em=Math.hypot((u-.5)*1.7,(v-.58)*1.15);if((em<.24&&em>.16)||em<.07)return pick(PAL.gold,.85);
   return v<.12?0:(u<.5?hex('#dc6a94'):hex('#bd4d7a'));});
  const lx=s*1.62,lp=iso(lx,G.front+.06,44),d=depthAt(lx,G.front+.1,44);
  for(let y=-6;y<=5;y++)for(let x=-2;x<=2;x++){const e=Math.abs(x)===2||y===-6||y===5;W.put(lp.x+x,lp.y+y,d,e?PAL.iron[1]:(x<0?hex('#fff0b8'):hex('#f5c96a')));}
  for(let x=-3;x<=3;x++)W.put(lp.x+x,lp.y-7,d,PAL.iron[2]);W.put(lp.x,lp.y-8,d,PAL.iron[2]);for(let x=0;x<4;x++)W.put(lp.x-s*x,lp.y-9,d,PAL.iron[1]);
 }
 // the gate's own lights: lanterns, lit lancets, the clock face, the lamp in the court beyond
 for(const s of [-1,1]){addLight(s*1.62,G.front+.4,44,.62,2.3,'lantern');const t=Math.PI/4+.05*s;addLight(s*4.55+Math.cos(t)*1.7,-.45+Math.sin(t)*1.7,87,.55,1.6,'window');}
 addLight(-4.55+Math.cos(Math.PI/4-.05)*1.7,-.45+Math.sin(Math.PI/4-.05)*1.7,48,.5,1.5,'window');
 addLight(2.15,G.front+.15,67,.55,1.6,'window');addLight(3.2,-.8,67,.5,1.5,'window');addLight(1.5,(ty0+ty1)/2,tz0+26,.45,1.5,'window');
 addLight(0,ty1+.2,tz0+28,.5,1.7,'clock');addLight(0,G.passageBack-.4,34,1.0,2.2,'court');
 // steps: three broad flights down to the road, worn in the middle
 const steps=[[G.front,G.front+.38,6],[G.front+.38,G.front+.76,4],[G.front+.76,G.front+1.15,2]];
 for(const [y0,y1,z] of steps)box(W,-1.85,y0,0,1.85,y1,z,(P,kind,b,u,v,x,y)=>{const j=Math.floor((P[0]+1.85)/.62),worn=Math.abs(P[0])<.8&&kind==='top'?.06:0;return pick(PAL.cobble,(kind==='top'?.6:kind==='front'?.4:.28)+worn+b*.18+(hash(j,z,4)-.5)*.1-((P[0]+1.85)%.62<.05?.2:0)-(kind==='front'&&P[2]<.8?.15:0));});
 // stone planters with roses either side of the steps
 for(const s of [-1,1]){const px=s*2.45;box(W,px-.35,G.front+.05,0,px+.35,G.front+.75,7,(P,kind,b)=>pick(PAL.pink,.35+.45*b-(P[2]>6?-.15:0)));
  const pb=new Buf(iso(px,G.front+.4).x-14,iso(px,G.front+.4).y-26,28,26);crown(pb,iso(px,G.front+.4,7).x,iso(px,G.front+.4,7).y-4,depthAt(px,G.front+.4,7)+.4,7,40+s,{squash:.8,dense:1.3});
  const fr=random(60+s);for(let k=0;k<14;k++){const x=iso(px,G.front+.4).x+Math.round((fr()-.5)*12),y=iso(px,G.front+.4,7).y-4+Math.round((fr()-.6)*8);if(pb.get(x,y))pb.put(x,y,9e9,fr()<.5?hex('#f7a8c4'):hex('#e06a94'));}
  pb.outline(.6).merge(W);
 }
 W.outline(.6);
 W.merge(buf);
}

// ---------- things people left here ----------
// Each has a reason: a board where the town posts notices, the last cart's crates by the
// gate, a cart left for the night, a shuttered market stall, a bench by the bridge lamp,
// a fingerpost where the lane forks. Footprints are kept clear for the road.
export const PROPS=[[-4.3,3.0,-3.3,3.6],[2.45,3.1,3.6,4.5],[-4.5,10.7,-2.9,11.7],[3.15,7.1,3.6,8.0],[-2.75,15.9,-2.2,16.5],[2.1,14.9,3.9,15.9]];
const stoneMat=(P,kind,b)=>pick(PAL.cobble,(kind==='top'?.62:kind==='front'?.44:.3)+b*.16+(hash(Math.floor(P[0]*5+P[1]*5),Math.floor(P[2]/4),3)-.5)*.12-((P[2]%4)<.8&&kind!=='top'?.12:0));
const plankMat=(axis,gap=.16)=>(P,kind,b,u,v,x,y)=>{const a=kind==='top'?(axis==='x'?P[1]:P[0]):kind==='front'?P[2]/16:P[2]/16,j=Math.floor(a/gap),f=a/gap-j;
 let t=.28+b*.42+(hash(j,Math.floor(kind==='top'?P[0]*3:0),8)-.5)*.14;if(f<.12)t-=.18;if(hash(x>>1,y,9)<.06)t-=.08;return pick(PAL.wood,t);};
const ironBand=(c,P,z0,z1)=>P[2]>z0&&P[2]<z1?pick(PAL.iron,.5):c;
function disc(t,cx,cy,cz,rx,rz,plane,mat){
 // a filled disc in the X–Z plane (wheels, lids) as a fan of triangles
 const n=18;for(let k=0;k<n;k++){const a0=k/n*Math.PI*2,a1=(k+1)/n*Math.PI*2,p=a=>plane==='xz'?[cx+Math.cos(a)*rx,cy,cz+Math.sin(a)*rz]:[cx+Math.cos(a)*rx,cy+Math.sin(a)*rx,cz];
  tri(t,[cx,cy,cz],p(a0),p(a1),(u,v,P,x,y)=>mat(P,u,v,x,y));}
}
const scratchBuf=(X,Y,w=140,h=120)=>{const p=iso(X,Y);return new Buf(p.x-w/2,p.y-h+30,w,h);};
function* props(buf,casters){
 const G=GATE;
 // stone bridge parapets where the road crosses the channel
 {const Y=channelY(roadCentre(8.6)),rc=roadCentre(Y),t=scratchBuf(rc,Y,180,120);
  for(const s of [-1,1]){const X=rc+s*(ROAD_HALF+.12),dark=(P,k,b)=>stoneMat(P,k,b*.4)-0;box(t,X-.1,Y-CH_HALF-.4,0,X+.1,Y+CH_HALF+.4,5,dark);box(t,X-.13,Y-CH_HALF-.48,5,X+.13,Y+CH_HALF+.48,6.5,dark);
   casters.push({kind:'box',x0:X-.14,x1:X+.14,y0:Y-CH_HALF-.45,y1:Y+CH_HALF+.45,h:10,dark:.8});}
  t.outline(.55).merge(buf);}
 yield;
 // notice board by the gate: two posts, a little gabled hood, pinned bills
 {const X=-4.3,Y=3.25,t=scratchBuf(X,Y);
  for(const dx of [.05,.9])box(t,X+dx,Y,0,X+dx+.1,Y+.1,30,plankMat('x'));
  quad(t,[X,Y+.12,12],[1.05,0,0],[0,0,15],(u,v,P,x,y)=>{
   const papers=[[.08,.42,.22,.9],[.47,.92,.5,.88],[.18,.4,.08,.36],[.58,.86,.1,.42]];for(const [a,b,c,d] of papers)if(u>a&&u<b&&v>c&&v<d){const k=(u-a)/(b-a);return (v-c)/(d-c)>.82||k<.08?pick(PAL.plaster,.55):(hash(Math.floor(u*40),Math.floor(v*30),2)<.18?pick(PAL.plaster,.6):pick(PAL.plaster,.9));}
   return pick(PAL.wood,.38+(hash(Math.floor(v*6),0,3)-.5)*.12-(((v*6)%1)<.1?.15:0));});
  box(t,X-.08,Y-.05,27,X+1.13,Y+.25,30,plankMat('x'));
  t.outline(.55).merge(buf);casters.push({kind:'box',x0:X,x1:X+1.05,y0:Y,y1:Y+.15,h:30,dark:.6});}
 // crates and barrels from the last coach of the day, stacked against the verge
 {const t=scratchBuf(3,3.8,170,130);
  const crate=(X,Y,s,z=0)=>{box(t,X,Y,z,X+s,Y+s,z+s*15,(P,kind,b,u,v,x,y)=>{const e=Math.min(u,v,1-u,1-v);if(e<.1)return pick(PAL.wood,.18+b*.3);return plankMat('x',.13)(P,kind,b,u,v,x,y);});
   casters.push({kind:'box',x0:X,x1:X+s,y0:Y,y1:Y+s,h:z+s*15,dark:.85});};
  crate(2.5,3.15,.55);crate(3.05,3.2,.5);crate(2.65,3.25,.42,8.2);
  const barrel=(X,Y)=>{cylinder(t,X,Y,.22,0,13,(P,k,b,u,v,x,y,am)=>{let c=pick(PAL.wood,.25+b*.5+(Math.floor(am*6)%2?.04:0));c=ironBand(c,P,2.5,3.6);return ironBand(c,P,9.4,10.5);},0,22);
   disc(t,X,Y,13,.22,0,'xy',(P,u,v,x,y)=>pick(PAL.wood,.6+(hash(x,y>>1,2)-.5)*.1));casters.push({kind:'round',cx:X,cy:Y,r:.22,z:0,h:13,dark:.85});};
  barrel(2.75,4.05);barrel(3.25,4.2);
  // a grain sack slumped against the crates
  const p=iso(3.55,3.75),d=depthAt(3.55,3.75)+.3;for(let y=-7;y<=0;y++)for(let x=-5;x<=5;x++){if((x/5.2)**2+((y+3.5)/4.2)**2>1)continue;t.put(p.x+x,p.y+y,d,pick(PAL.dirt,.7-x*.05-(y+3)*.04+(hash(x,y,3)-.5)*.06));}
  t.outline(.55).merge(buf);}
 yield;
 // a hand cart left by the wall for the night, shafts down
 {const X=-4.4,Y=10.8,t=scratchBuf(X+.7,Y+.4,180,130);
  box(t,X,Y,7,X+1.4,Y+.8,9,plankMat('y',.14));
  for(const [x0,y0,x1,y1] of [[X,Y,X+1.4,Y+.06],[X,Y+.74,X+1.4,Y+.8],[X+1.34,Y,X+1.4,Y+.8]])box(t,x0,y0,9,x1,y1,13,plankMat('x'));
  for(const yy of [Y-.02,Y+.82])disc(t,X+.7,yy,7,.42,7,'xz',(P,u,v,x,y)=>{const dx=(P[0]-(X+.7))/.42,dz=(P[2]-7)/7,r=Math.hypot(dx,dz);if(r>.82)return pick(PAL.iron,.45);if(r<.18)return pick(PAL.wood,.25);const sp=Math.atan2(dz,dx)*8/Math.PI;return Math.abs(sp-Math.round(sp))<.18?pick(PAL.wood,.55):0;});
  for(const yy of [Y+.12,Y+.62])box(t,X-1.1,yy,1,X,yy+.07,3,plankMat('x'));
  t.outline(.55).merge(buf);casters.push({kind:'box',x0:X,x1:X+1.4,y0:Y,y1:Y+.8,h:13,dark:.8});}
 // a bench by the bridge lamp
 {const X=3.2,Y=7.15,t=scratchBuf(X,Y+.4);
  box(t,X,Y,6,X+.38,Y+.8,7.5,plankMat('y',.13));box(t,X+.3,Y,7.5,X+.38,Y+.8,15,plankMat('y',.13));
  for(const yy of [Y+.05,Y+.68])box(t,X+.03,yy,0,X+.12,yy+.08,6,plankMat('x'));
  t.outline(.55).merge(buf);casters.push({kind:'box',x0:X,x1:X+.38,y0:Y,y1:Y+.8,h:15,dark:.6});}
 // fingerpost where a lane leaves the road
 {const X=-2.5,Y=16.2,t=scratchBuf(X,Y);
  box(t,X,Y,0,X+.1,Y+.1,36,plankMat('x'));box(t,X-.6,Y+.02,28,X+.55,Y+.08,32,plankMat('x'));
  tri(t,[X+.55,Y+.08,26.5],[X+.55,Y+.08,33.5],[X+.75,Y+.08,30],(u,v,P)=>pick(PAL.wood,.5));
  box(t,X+.02,Y-.5,21,X+.08,Y+.45,25,plankMat('y'));tri(t,[X+.08,Y-.5,19.5],[X+.08,Y-.5,26.5],[X+.08,Y-.7,23],(u,v,P)=>pick(PAL.wood,.4));
  t.outline(.55).merge(buf);casters.push({kind:'round',cx:X,cy:Y,r:.06,z:0,h:36,dark:.6});}
 // a market stall shut for the night: counter shuttered, awning rolled and tied
 {const X=2.2,Y=15,t=scratchBuf(X+.8,Y+.4,200,150);
  box(t,X,Y,0,X+1.6,Y+.8,11,(P,kind,b,u,v,x,y)=>kind==='front'||kind==='side'?plankMat(kind==='front'?'x':'y',.15)(P,kind,b,u,v,x,y):pick(PAL.wood,.55+b*.2));
  for(const [px,py] of [[X,Y],[X+1.52,Y],[X,Y+.72],[X+1.52,Y+.72]])box(t,px,py,11,px+.08,py+.08,28,plankMat('x'));
  quad(t,[X-.1,Y-.05,28],[1.8,0,0],[0,.9,-4],(u,v,P,x,y)=>{const st=Math.floor(u*9)%2;return st?hex('#b8434f'):pick(PAL.plaster,.8+v*.1);});
  box(t,X-.08,Y+.82,22,X+1.68,Y+.94,25,(P,kind,b)=>Math.floor((P[0]-X)*5)%2?hex('#9e3642'):pick(PAL.plaster,.75));
  for(const yy of [Y+.25])box(t,X+.3,yy,11,X+.75,yy+.4,16,plankMat('x',.12));
  t.outline(.55).merge(buf);casters.push({kind:'box',x0:X,x1:X+1.6,y0:Y,y1:Y+.8,h:28,dark:.7});}
 yield;
}

// ---------- doors (dynamic) ----------
// Double door, each leaf a plank panel turning inward about its hinge. Rasterised with the
// same depth metric as the scene so the jambs and vault hide the leaves where they should.
export function doorLeafPoint(s,angle,u,Z){
 // world point on leaf s (−1 left, +1 right) at fraction u from hinge toward the meeting edge
 const a=GATE.half;return [s*a-s*u*a*Math.cos(angle),GATE.doorY-u*a*Math.sin(angle),Z];
}
export function drawDoors(buf,angle){
 const G=GATE,a=G.half,sp=G.spring,T=.12;
 for(const s of [-1,1]){
  const hx=s*a,dir=[-s*Math.cos(angle),-Math.sin(angle),0];
  const inside=(u,Z)=>{const X=s*a-s*u*a;return Z<sp||Math.hypot(X/a,(Z-sp)/(a*16))<1;};
  const shade=.42+.4*Math.cos(angle)*(s<0?1:.7);
  const plank=(u,v,P,x,y)=>{
   const Z=P[2];if(!inside(u,Z))return 0;
   if((Z>10&&Z<13.5)||(Z>44&&Z<47.5))return pick(PAL.iron,.35+shade*.4+(Z%3.5<1?.15:0));
   if(((Z>11&&Z<12.5)||(Z>45&&Z<46.5))&&Math.round(u*12)%3===0)return PAL.iron[3];
   if(u>.82&&u<.92&&Z>26&&Z<34){const ring=Math.hypot((u-.87)*24,(Z-30)/3);if(ring>.6&&ring<1.25)return pick(PAL.gold,.6+shade*.3);}
   const pl=Math.floor(u*6),fu=u*6-pl;let t=.25+shade*.45+(hash(pl,s,2)-.5)*.12;if(fu<.1)t-=.24;else if(fu>.85)t+=.06;
   if(hash(x>>1,y,5+s)<.07)t-=.1;
   return pick(PAL.wood,t);
  };
  quad(buf,[hx,G.doorY,G.floor],dir.map(c=>c*a),[0,0,G.height-G.floor],plank,4);
  // free edge: the leaf's thickness becomes visible as it turns
  if(angle>.04){const e=[hx+dir[0]*a,G.doorY+dir[1]*a,G.floor],perp=[-dir[1]*s,dir[0]*s,0];
   quad(buf,e,perp.map(c=>c*T),[0,0,G.height-G.floor],(u,v,P)=>inside(1,P[2])?pick(PAL.wood,.62):0,4);
  }
 }
}

// ---------- the whole place ----------
export const AREA={X0:-26,X1:26,Y0:-21,Y1:34};
export function* bakeTown(seed=1){
 const {X0,X1,Y0,Y1}=AREA,c=[iso(X0,Y0),iso(X1,Y0),iso(X0,Y1),iso(X1,Y1)];
 const minx=Math.min(...c.map(p=>p.x)),maxx=Math.max(...c.map(p=>p.x)),miny=Math.min(...c.map(p=>p.y))-180,maxy=Math.max(...c.map(p=>p.y))+8;
 const buf=new Buf(minx,miny,maxx-minx,maxy-miny),casters=[],r=random(seed);LIGHTS.length=0;
 // ambient occlusion beside the wall foot and the road edge
 const ao=(X,Y)=>(Y>-1&&Y<.7&&Math.abs(X)>3?.18*(1-(Y+1)/1.7):0);
 yield* bakeGround(buf,AREA,{ao});
 meadowDetails(buf,AREA,r);yield;
 const plants=[];
 // town behind the walls: rooftops of several houses rise over the curtain
 const homes=[[-9,-6.2,-6.6,-4.4,30,18,PAL.slate],[-5.8,-7.6,-3.4,-5.6,34,16,PAL.roof],[3.3,-7.4,6,-5.4,32,18,PAL.slate],[6.8,-5.9,9.4,-3.9,28,16,PAL.roof],[-1.6,-8.6,1.6,-6.6,40,20,PAL.slate],[10.4,-7.6,12.8,-5.4,30,16,PAL.slate],[-12.5,-6.2,-10.2,-4.2,28,15,PAL.roof],[-17.4,-6.4,-15,-4.4,30,16,PAL.slate],[15.6,-7,18,-5,32,17,PAL.roof],[-20.5,-5.8,-18.4,-3.8,26,15,PAL.roof],[19.4,-6.2,21.8,-4.2,28,16,PAL.slate]];
 // further rows of the town, packed along lanes, so the roofscape continues over the wall
 const townTrees=[];{const rr=random(808);for(let row=0;row<4;row++){const Yb=-10.2-row*2.5;for(let X=-23+row*.7;X<23;){const w=1.7+rr()*1.6,gap=.3+rr()*.7,dy=(rr()-.5)*.9,depth=1.6+rr()*.6;
  if(rr()<.16){townTrees.push([X+w/2,Yb-1+dy,14+rr()*6]);X+=w*.8+gap;continue;}
  homes.push([X,Yb-depth+dy,X+w,Yb+dy,24+Math.round(rr()*18),13+Math.round(rr()*8),rr()<.5?PAL.slate:PAL.roof]);X+=w+gap;}}}
 homes.sort((p,q)=>(p[0]+p[1])-(q[0]+q[1]));
 for(const [a,b,cc,d,h,rh,m] of homes)casters.push(house(buf,a,b,cc,d,h,rh,Math.round(a*7+b),m));
 yield;
 gatehouse(buf,casters);yield;
 // Planting in groves, like a real verge: big framing masses away from the road, open
 // lawn near the gate, single specimen trees where the eye needs a stop.
 const clear=(X,Y,m=0)=>Math.abs(X-roadCentre(Y))<ROAD_HALF+1.1+m||Math.abs(Y-channelY(X))<.9+m||PROPS.some(([a,b,c,d])=>X>a-.6-m&&X<c+.6+m&&Y>b-.6-m&&Y<d+.6+m)||(Y<2.9&&Math.abs(X)<3.6+m)||(Y<2.4&&Math.abs(X)<6.4+m)||(Y<.4&&Y>-1.4)||Y<-1.4;
 const groves=[[-8.5,3.2,3.2,9],[-12.5,7,4,10],[8.8,3.6,3,8],[13,9,4,10],[-7,13.5,3.5,8],[8,17,4,9],[-14,1.5,3,6],[15,2,3,6],[-4.5,21,3.5,7],[3.8,24,4,8],[-15,16,4,8],[16,16,3.5,7]];
 const items=[];
 for(const [gx,gy,rad,n] of groves)for(let k=0;k<n;k++){const a=r()*Math.PI*2,q=Math.sqrt(r())*rad,X=gx+Math.cos(a)*q,Y=gy+Math.sin(a)*q*.8;if(clear(X,Y))continue;
  const kk=r();items.push({X,Y,s:15+r()*9,k:kk<.62?'oak':kk<.85?'round':'pine',t:'tree'});}
 for(const [X,Y,s,k] of [[-5.2,7.6,17,'oak'],[5.6,10.6,19,'oak'],[-3.8,1.6,13,'round'],[4.6,1.8,12,'pine']])items.push({X,Y,s,k,t:'tree'});
 // behind the wall: crowns rising between the roofs
 for(const [X,Y,s] of [[-14.5,-4.2,19],[-8,-9,17],[0.2,-10.5,16],[8.8,-9.2,18],[14.8,-4.6,19],[-3.4,-3.4,13],[4,-3.2,12],...townTrees])items.push({X,Y,s,k:'oak',t:'tree'});
 // bushes hug paths, wall feet and the groves' edges
 for(const [X,Y,s,f] of [[-3.3,2.2,6,2],[3.4,2.3,6,1],[-6.6,.85,7,0],[6.7,.9,7,2],[-7.6,1.2,6,1],[7.9,1.3,5,0],[-10,.8,7,1],[10.5,.8,7,0],[-2.8,5,6,0],[3.4,5.6,6,2],[-3.1,9,5,1],[3.3,12.5,6,3],[-5.2,16.8,7,0],[2.8,19.4,6,1]])items.push({X,Y,s,f,t:'bush'});
 for(let k=0;k<26;k++){const g=groves[k%groves.length],a=r()*Math.PI*2,X=g[0]+Math.cos(a)*(g[2]+.6),Y=g[1]+Math.sin(a)*(g[2]+.6)*.8;if(!clear(X,Y,-.5))items.push({X,Y,s:5+r()*3,f:k%4===0?1+(k>>2)%4:0,t:'bush'});}
 items.sort((a,b)=>(a.X+a.Y)-(b.X+b.Y));
 for(const it of items)casters.push(it.t==='tree'?tree(buf,it.X,it.Y,it.s,Math.round(it.X*31+it.Y*7),{kind:it.k}):bush(buf,it.X,it.Y,it.s,Math.round(it.X*13+it.Y*29),it.f));
 yield;
 for(const [X,Y,s] of [[-2.4,6.8,3],[2.6,3.8,2],[5.6,6.6,3],[-5.4,7.2,2],[2.2,13.4,2.5],[-2.8,14,2],[-1.9,18.6,2.5]])rock(buf,X+roadCentre(Y)*.0,Y,s,Math.round(X*9+Y));
 const lamps=[[-1.85,2.6],[1.95,7.4],[-1.95,12.6],[1.95,18]];
 for(const [X,Y] of lamps)casters.push(lampPost(buf,X+roadCentre(Y),Y));
 fence(buf,4.4,4.4,7.4,4.4);fence(buf,-7.4,9.8,-4.8,9.8);
 yield* props(buf,casters);
 yield;
 shadowPass(buf,casters);
 return {buf,lamps:lamps.map(([X,Y])=>[X+roadCentre(Y),Y]),lights:LIGHTS.map(l=>({...l}))};
}
