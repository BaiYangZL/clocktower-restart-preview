// Night lighting, baked once per visit. Every pixel of the town keeps its depth, so its
// world position can be recovered and lit by the registered lamps, lanterns and windows:
//   colour = albedo × (cool moon ambient + Σ warm point lights)
// Lit glass and flames stay at full value (they are the light). In the rain the paving
// darkens and turns glossy, puddles open on the road and every light leaves a vertical
// streak in the wet ground below it — the reflection a viewer from this angle would see.
import {HW,HH,hash,fbm,WATER,GLASS,roadCentre,ROAD_HALF,channelY,CH_HALF} from './town-gate.js';
import {clamp} from './journey.js';

const R=c=>c&255,G=c=>c>>>8&255,B=c=>c>>>16&255;
const pack=(r,g,b)=>(255<<24|clamp(b|0,0,255)<<16|clamp(g|0,0,255)<<8|clamp(r|0,0,255))>>>0;
const hx=h=>{const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];};
const GLOW=new Map([
 [GLASS.lit,1],[GLASS.mid,1],[GLASS.deep,1],[GLASS.house,1],[GLASS.house2,1],
 ...['#ffe9a6','#f5c45a','#fff0b8','#f5c96a'].map(h=>{const [r,g,b]=hx(h);return [(255<<24|b<<16|g<<8|r)>>>0,1.05];}),
 ...['#f2e8d2','#fffaf0'].map(h=>{const [r,g,b]=hx(h);return [(255<<24|b<<16|g<<8|r)>>>0,.8];})
]);
export const WEATHER={
 clear:{amb:[.34,.40,.62],top:[.08,.09,.12],haze:hx('#18203a'),wet:0},
 rain:{amb:[.29,.34,.54],top:[.05,.06,.09],haze:hx('#1a2238'),wet:1}
};
const WARM=[1.0,.73,.47];

export function createLighting(lights,weather){
 const Wt=WEATHER[weather]||WEATHER.clear,CELL=2,grid=new Map(),key=(i,j)=>i*4096+j;
 for(const L of lights){const reach=L.r*2.4+(Wt.wet?3:0);
  for(let i=Math.floor((L.X-reach)/CELL);i<=Math.floor((L.X+reach)/CELL);i++)for(let j=Math.floor((L.Y-reach)/CELL);j<=Math.floor((L.Y+reach+(Wt.wet?2.5:0))/CELL);j++){const k=key(i,j);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(L);}}
 for(const L of lights){const p={x:(L.X-L.Y)*HW,y:(L.X+L.Y)*HH};L.sx=p.x;L.groundY=p.y;}
 // world position from a pixel's screen position and depth
 const world=(x,y,d)=>{const S=(8*d+y)/16,Z=(8*d-y)/2,D=x/16;return [(S+D)/2,(S-D)/2,Z];};
 const onPaving=(X,Y)=>Math.abs(X-roadCentre(Y))<ROAD_HALF+.15||(Y>-1.6&&Y<2.3&&Math.abs(X)<2.6)||Y<-1.6;
 const puddle=(X,Y)=>onPaving(X,Y)&&fbm(X*.75+11,Y*.75+3,61,3)>.64;
 // shade one pixel; tag 1 = ground, 2 = gate passage, others = solid things
 function shade(c,x,y,d,tag){
  const glow=GLOW.get(c);
  const [X,Y,Z]=world(x+.5,y+.5,d);
  if(glow)return glow>=1?c:pack(R(c)*.95,G(c)*.9,B(c)*.8);
  let r=R(c),g=G(c),b=B(c);
  const isWater=WATER.has(c),ground=tag===1&&Z<3;
  let wet=0,pud=false;
  if(isWater)wet=1.4;
  else if(Wt.wet&&ground){wet=onPaving(X,Y)?1:.55;pud=puddle(X,Y);if(pud)wet=1.8;}
  if(wet){const k=pud?.55:isWater?.75:.82;r*=k;g*=k;b*=k*1.04;}
  if(pud){r=r*.5+20;g=g*.5+26;b=b*.5+46;}                         // still water: mostly sky
  // ambient with a little more moonlight on high, open surfaces
  const up=clamp(Z/120);let lr=Wt.amb[0]+Wt.top[0]*up,lg=Wt.amb[1]+Wt.top[1]*up,lb=Wt.amb[2]+Wt.top[2]*up;
  let sr=0,sg=0,sb=0;
  const list=grid.get(key(Math.floor(X/CELL),Math.floor(Y/CELL)));
  if(list)for(const L of list){
   const dx=X-L.X,dy=Y-L.Y,dz=(Z-L.Z)/26,d2=dx*dx+dy*dy+dz*dz,R2=L.r*L.r*4;
   if(d2<R2){const w=1-d2/R2,f=L.i*w*w/(1+d2/(L.r*L.r)*1.6);lr+=WARM[0]*f;lg+=WARM[1]*f;lb+=WARM[2]*f;}
   if(wet){// reflection streak: centred on the light's mirror image below the ground
    const ex=(x-L.sx)/(4+L.Z*.04),ey=(y-(L.groundY+L.Z*.92))/(7+L.Z*.42);const e=ex*ex+ey*ey;
    if(e<9){const k=L.i*Math.exp(-e)*(pud?1.25:isWater?.9:.4)*(L.kind==='window'?.5:1);sr+=255*k*WARM[0];sg+=255*k*WARM[1];sb+=255*k*WARM[2];}}
  }
  if(tag===2){lr+=.18;lg+=.12;lb+=.07;}                            // the passage, lit from the court beyond
  r=r*lr+sr*.9;g=g*lg+sg*.9;b=b*lb+sb*.9;
  // air between the gate and the far rows of the town: cooler and flatter with distance
  const far=clamp((-(X+Y)-12)/18)*.55;if(far>0){r+=(Wt.haze[0]-r)*far;g+=(Wt.haze[1]-g)*far;b+=(Wt.haze[2]-b)*far;}
  return pack(r,g,b);
 }
 // the full-scene pass; yields between bands of rows. Also collects puddle spots for ripples.
 function* pass(buf){
  const out=[];const {w,h,col,dep,tag,x0,y0}=buf;
  for(let y=0;y<h;y++){
   for(let x=0;x<w;x++){const i=y*w+x,c=col[i];if(!c)continue;
    const t=tag[i];col[i]=shade(c,x+x0,y+y0,dep[i],t);
    if(Wt.wet&&t===1&&(x&7)===0&&(y&3)===0){const [X,Y,Z]=world(x+x0+.5,y+y0+.5,dep[i]);if(Z<3&&puddle(X,Y)&&hash(x,y,5)<.5)out.push({x:x+x0,y:y+y0});}
   }
   if((y&31)===31)yield;
  }
  return out;
 }
 return {shade,pass,world,weather:Wt};
}
