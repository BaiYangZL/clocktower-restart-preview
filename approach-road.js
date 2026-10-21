// The old road up to the gate, painted once at load in the gate art's manner. The 05 gate
// art ends just below the steps (its lowest band and its left edge were stretched filler);
// this layer lies under it and carries the cobbled road a long way out to the south-west,
// so the arrival travels up a real road to the door instead of landing on the steps.
// Rounded setts with ink seams and moss, grass verges, lamp posts like the art's own, roadside
// trees painted with the same clump painter as the swaying foreground trees, a fence, a
// milestone, wildflowers; light pools under every lamp, the night deepening away from the gate.
// Positions are scene px of the gate art (x<0 is west of it).
import {random,clamp} from './journey.js';
import {paintClump,paintTrunk,RES} from './painted-flora.js';

export const APPROACH={x:-1400,y:300,w:2581,h:2280};
// the road's centre line from inside the forecourt out to the far end
// it now begins at the foot of the castle steps: the forecourt is the same paving as the road
const CTRL=[[575,928],[470,968],[290,1110],[-30,1360],[-300,1620],[-520,1900],[-690,2200],[-800,2580]];
// across the road runs the wall's axis (the art's floor grid)
const ACROSS=[.945,.327],HALF=140;
const GATE={x:430,y:1000};
const INK='#1a1220';

function canvas(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;}
function catmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t,f=(a,b,c,d)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);return [f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])];}
// dense samples of the centre line with arc length, from the forecourt (s=0) outwards
const LINE=(()=>{const pts=[];
 for(let i=0;i<CTRL.length-1;i++){const p0=CTRL[Math.max(0,i-1)],p1=CTRL[i],p2=CTRL[i+1],p3=CTRL[Math.min(CTRL.length-1,i+2)];
  for(let k=0;k<24;k++)pts.push(catmull(p0,p1,p2,p3,k/24));}
 pts.push(CTRL[CTRL.length-1]);
 let s=0;return pts.map((p,i)=>{if(i)s+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]);return {x:p[0],y:p[1],s};});})();
export const ROAD_LENGTH=LINE[LINE.length-1].s;
// point and unit direction (pointing away from the gate) at arc length s
export function roadAt(s){
 s=clamp(s,0,ROAD_LENGTH);let i=1;while(i<LINE.length-1&&LINE[i].s<s)i++;
 const a=LINE[i-1],b=LINE[i],k=(s-a.s)/((b.s-a.s)||1),dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
 return {x:a.x+dx*k,y:a.y+dy*k,dx:dx/l,dy:dy/l};
}
// where the forecourt of the art meets this road
export const SEAM_S=LINE.find(p=>p.y>=1110).s;
// distance from the road's centre measured across it, in the road's own skewed frame
export function roadClearance(x,y){let d=1e9;for(let t=0;t<=ROAD_LENGTH;t+=20){const p=roadAt(t),ex=x-p.x,ey=y-p.y,det=ACROSS[0]*p.dy-ACROSS[1]*p.dx;
  const a=(ex*p.dy-ey*p.dx)/det,b=(ACROSS[0]*ey-ACROSS[1]*ex)/det;d=Math.min(d,Math.abs(a)+Math.max(0,Math.abs(b)-10)*4);}return d;}
export const ROAD_HALF=HALF;
const clear=roadClearance;
const side=(s,off)=>{const p=roadAt(s);return {x:p.x+ACROSS[0]*off,y:p.y+ACROSS[1]*off};};

// road lamps, alternating sides, the art's lamp at x=395 continuing the row
// the art's own forecourt lamp: its cobbles are now cut away, so it is redrawn in the same
// iron as the road lamps, standing where its post met the ground (glass centre at y≈974)
export const ART_LAMP={x:396,y:1155,head:{x:396,y:970}};
export const ROAD_LAMPS=[[520,-1],[860,1],[1200,-1],[1540,1],[1880,-1]].map(([s,k])=>{const b=side(SEAM_S+s,k*(HALF+18));const c=roadAt(SEAM_S+s);return {x:b.x,y:b.y,head:{x:b.x,y:b.y-185},onRoad:{x:b.x+(c.x-b.x)*.35,y:b.y+(c.y-b.y)*.35}};});

function lampLight(x,y){
 let k=0;for(const l of ROAD_LAMPS){const d=Math.hypot(l.x-x,(l.y-y)*1.6);k+=1/(1+(d/120)**2);}
 // the art's own lamp just above the seam, and the lit forecourt
 k+=1/(1+(Math.hypot(395-x,(1000-y)*1.6)/150)**2);
 return clamp(k);
}
const night=(x,y)=>clamp((Math.hypot(x-GATE.x,(y-GATE.y)*1.1)-260)/1500);
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const rgb=c=>`rgb(${c[0]},${c[1]},${c[2]})`;

// A few painted clumps and trunks are reused, scaled and mirrored, for every roadside tree:
// painting each clump afresh cost seconds at load.
const CLUMPS=new Map(),TRUNKS=new Map(),R0=64,H0=320;
function clumpArt(rnd,tone,flat=1){const v=(rnd()*5)|0,k=tone+flat+v;if(!CLUMPS.has(k))CLUMPS.set(k,paintClump(R0,{tone,light:[.7,-.7],seed:97+v*31+tone.length,flat}));return CLUMPS.get(k);}
function drawClump(g,rnd,x,y,r,tone,flat){const p=clumpArt(rnd,tone,flat),k=r/R0,w=p.canvas.width/RES*k,h=p.canvas.height/RES*k;g.drawImage(p.canvas,x-p.ox*k,y-p.oy*k,w,h);}
function paintTree(g,rnd,x,y,{h=320,lean=0,scale=1,tones=['lit','cool','near']}){
 const v=(rnd()*4)|0;if(!TRUNKS.has(v))TRUNKS.set(v,paintTrunk(H0,{seed:11+v*7,lean:(v-1.5)*.06,limbs:[[.62,-60,-50,11],[.72,70,-56,10],[.5,-90,-24,8]]}));
 const t=TRUNKS.get(v),k=h*scale/H0;
 g.drawImage(t.canvas,x-t.ox*k,y-t.oy*k,t.canvas.width/RES*k,t.canvas.height/RES*k);
 const top=h*scale*.78,R=62*scale;
 const clumps=[[-80,-top-10,.9,0],[20,-top-60,1,0],[100,-top-5,.85,0],[-50,-top+80,1,1],[60,-top+70,1.05,1],[-110,-top+140,.8,2],[10,-top+150,.95,2],[110,-top+120,.75,2]];
 for(const [dx,dy,r,ti] of clumps){if(rnd()<.12)continue;
  drawClump(g,rnd,x+dx*scale+(rnd()-.5)*14,y+dy+(rnd()-.5)*10,R*r*(.9+rnd()*.2),tones[ti],1);}
}
function paintBush(g,rnd,x,y,{r=40,n=4,tone='cool'}){
 for(let i=0;i<n;i++)drawClump(g,rnd,x+(i-(n-1)/2)*r*.9+(rnd()-.5)*10,y-r*.5+(rnd()-.5)*12,r*(.8+rnd()*.4),i>n/2?'near':tone,.8);
}
// a puddle that reads as water: an irregular pool of three overlapping lobes, the night sky
// in it (darker than wet stone, never black), a thin bright far rim, a soft wet margin
export function paintPuddle(g,x,y,w,h,rot=0){
 const k=(x*13.7+y*7.3)%1,lobes=[[0,0,1,1],[-.42,.12,.62,.8+.2*k],[.38+.1*k,-.08,.58,.75]];
 const shape=(grow,dy=0)=>{g.beginPath();for(const [dx,dy2,sx,sy] of lobes){g.moveTo(dx*w+sx*w+grow,dy2*h+dy);g.ellipse(dx*w,dy2*h+dy,sx*w+grow,sy*h+grow*.45,0,0,7);}};
 g.save();g.translate(x,y);g.rotate(rot);
 g.fillStyle='rgba(18,20,36,.2)';shape(5,1);g.fill();
 const gr=g.createLinearGradient(0,-h,0,h);gr.addColorStop(0,'rgba(70,78,122,.7)');gr.addColorStop(.55,'rgba(40,42,72,.7)');gr.addColorStop(1,'rgba(54,58,96,.66)');
 g.fillStyle=gr;shape(0);g.fill();
 g.save();shape(0);g.clip();g.strokeStyle='rgba(196,210,244,.45)';g.lineWidth=1.2;for(const [dx,dy2,sx,sy] of lobes){g.beginPath();g.ellipse(dx*w,dy2*h+1.2,sx*w,sy*h,0,Math.PI*1.1,Math.PI*1.9);g.stroke();}
 g.fillStyle='rgba(170,190,235,.16)';g.beginPath();g.ellipse(-w*.2,-h*.3,w*.5,h*.2,0,0,7);g.fill();g.restore();
 g.restore();}
// a fallen leaf on the ground: a small inked oval, some fresh, some turning
const LEAF_COLS=['#8fb257','#6f9a46','#b5c766','#a07f3a','#c08a3a','#7a5a2a'];
function fallenLeaf(g,rnd,x,y){const r=rnd()*7,c=LEAF_COLS[(rnd()*LEAF_COLS.length)|0];g.save();g.translate(x,y);g.rotate(r);g.scale(1,.55);
 g.fillStyle=INK;g.beginPath();g.ellipse(0,0,4.6,2.6,0,0,7);g.fill();g.fillStyle=c;g.beginPath();g.ellipse(0,0,3.7,1.8,0,0,7);g.fill();g.restore();}
// an iron lamp post like the art's: a round plinth, a slim post with collars, and a
// hexagonal lantern — dark iron cap with a finial, three tall warm panes, a drip cup below
export function paintLampPost(g,x,y){
 const iron='#2a2430',ironHi='#5e5262';
 g.fillStyle='rgba(30,18,24,.35)';g.beginPath();g.ellipse(x,y+2,20,6.5,0,0,7);g.fill();
 // plinth
 g.fillStyle=INK;g.beginPath();g.ellipse(x,y-2,12,5,0,0,7);g.fill();g.fillRect(x-12,y-14,24,12);g.beginPath();g.ellipse(x,y-14,12,5,0,0,7);g.fill();
 g.fillStyle='#3e3644';g.fillRect(x-10,y-14,20,11);g.fillStyle=ironHi;g.fillRect(x-10,y-14,4,11);
 // post with two collars
 g.fillStyle=INK;g.fillRect(x-5,y-150,10,138);g.fillStyle=iron;g.fillRect(x-3.5,y-150,7,137);g.fillStyle=ironHi;g.fillRect(x-3.5,y-150,1.8,137);
 for(const yy of [y-30,y-100,y-152]){g.fillStyle=INK;g.fillRect(x-7,yy-4,14,8);g.fillStyle=ironHi;g.fillRect(x-6,yy-3,3,6);}
 // lantern
 const b=y-158,t=b-46;
 g.fillStyle=INK;g.beginPath();g.moveTo(x-9,b);g.lineTo(x+9,b);g.lineTo(x+5,b+7);g.lineTo(x-5,b+7);g.closePath();g.fill();
 g.beginPath();g.moveTo(x-15,b);g.lineTo(x+15,b);g.lineTo(x+13,t);g.lineTo(x-13,t);g.closePath();g.fill();
 const glass=g.createLinearGradient(x,t,x,b);glass.addColorStop(0,'#fff6cf');glass.addColorStop(.45,'#ffd77e');glass.addColorStop(1,'#f39a3c');
 for(const [x0,w] of [[-12,6.5],[-4,8],[5,6.5]]){g.fillStyle=glass;g.fillRect(x+x0,t+3,w,b-t-6);}
 g.fillStyle='rgba(255,255,240,.85)';g.fillRect(x-3,t+5,2,b-t-14);
 // cap: a flared roof, a knob, a finial
 g.fillStyle=INK;g.beginPath();g.moveTo(x-19,t+2);g.lineTo(x+19,t+2);g.lineTo(x+8,t-10);g.lineTo(x-8,t-10);g.closePath();g.fill();
 g.fillStyle=iron;g.beginPath();g.moveTo(x-16,t);g.lineTo(x+16,t);g.lineTo(x+7,t-8);g.lineTo(x-7,t-8);g.closePath();g.fill();
 g.fillStyle=ironHi;g.fillRect(x-7,t-8,5,2);
 g.fillStyle=INK;g.beginPath();g.arc(x,t-13,4.5,0,7);g.fill();g.beginPath();g.moveTo(x-2.5,t-15);g.lineTo(x,t-26);g.lineTo(x+2.5,t-15);g.fill();
 g.fillStyle=ironHi;g.beginPath();g.arc(x-1,t-14,1.5,0,7);g.fill();
}

export function paintApproach({weather='clear',quality='high'}={}){
 const low=quality==='low',S=low?.5:quality==='ultra'?1.5:1,A=APPROACH,c=canvas(A.w*S,A.h*S),g=c.getContext('2d'),rnd=random(9157);
 g.setTransform(S,0,0,S,-A.x*S,-A.y*S);
 const rain=weather==='rain';
 // ---------- meadow ----------
 g.fillStyle='#4c6e34';g.fillRect(A.x,A.y,A.w,A.h);
 for(let i=0;i<(low?140:260);i++){const x=A.x+rnd()*A.w,y=A.y+rnd()*A.h,r=60+rnd()*160,gr=g.createRadialGradient(x,y,0,x,y,r);
  const dark=rnd()<.5;gr.addColorStop(0,dark?'rgba(30,52,30,.3)':'rgba(150,176,70,.24)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
 // by the forecourt the art's grass is warm and bright; the meadow matches it there and darkens outwards
 {const gr=g.createRadialGradient(GATE.x+60,GATE.y+130,0,GATE.x+60,GATE.y+130,520);gr.addColorStop(0,'rgba(140,170,70,.75)');gr.addColorStop(.5,'rgba(110,150,60,.4)');gr.addColorStop(1,'rgba(90,130,60,0)');
  g.save();g.translate(GATE.x+60,GATE.y+130);g.scale(1.5,.8);g.translate(-GATE.x-60,-GATE.y-130);g.fillStyle=gr;g.fillRect(GATE.x-900,GATE.y-700,1900,1500);g.restore();}
 const nearGate=(x,y)=>clamp(1-Math.hypot((x-GATE.x-60)/1.5,(y-GATE.y-130)/.8)/520);
 // grass tufts: short blades, lit tips towards the lamps
 const tuft=(x,y,k,sz=1)=>{const L=Math.max(lampLight(x,y),nearGate(x,y)*.85),base=mix([60,98,44],[120,164,58],L*.8+k*.3),tip=mix([108,150,62],[214,214,104],Math.min(1,L+.15));
  for(let j=0;j<4;j++){const a=-Math.PI/2+(rnd()-.5)*1.1,l=(5+rnd()*7)*sz,x0=x+(rnd()-.5)*6;
   g.strokeStyle=rgb(j<2?base:tip);g.lineWidth=1.6*sz;g.beginPath();g.moveTo(x0,y);g.lineTo(x0+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}};
 g.lineCap='round';
 for(let i=0;i<(low?5000:12000);i++){const x=A.x+rnd()*A.w,y=A.y+rnd()*A.h;tuft(x,y,rnd()*.6);}

 // ---------- the road ----------
 const edgeL=[],edgeR=[];
 for(let s=0;s<=ROAD_LENGTH;s+=12){const w=HALF+8*Math.sin(s/90)+5*Math.sin(s/37)+150*Math.max(0,1-s/260)**1.5;edgeL.push(side(s,-w));edgeR.push(side(s,w*.97));}
 const road=()=>{g.beginPath();g.moveTo(edgeL[0].x,edgeL[0].y);for(const p of edgeL)g.lineTo(p.x,p.y);for(const p of [...edgeR].reverse())g.lineTo(p.x,p.y);g.closePath();};
 road();g.fillStyle='#9a8452';g.fill();
 {g.save();road();g.clip();for(let i=0;i<(low?600:1600);i++){const t=rnd()*ROAD_LENGTH,p=side(t,(rnd()-.5)*2*HALF);g.fillStyle=rnd()<.5?'rgba(120,140,60,.5)':'rgba(80,60,40,.35)';g.beginPath();g.ellipse(p.x,p.y,3+rnd()*5,1.5+rnd()*2,0,0,7);g.fill();}g.restore();}
 g.save();road();g.clip();
 // Flagstones as the art lays them: irregular, rounded, flat stones in pink-mauve, a lit
 // warm top and a darker lower lip, set in ochre-moss joints. A jittered grid in the road's
 // own frame (across × along) gives each stone a neighbour on every side, so the joints read
 // as one bed of stone rather than separate pebbles.
 const ACx=ACROSS[0],ACy=ACROSS[1],CA=44,CL=27;
 const jitter=(i,j)=>{const h=Math.sin(i*127.1+j*311.7)*43758.5453,f=h-Math.floor(h),h2=Math.sin(i*269.5+j*183.3)*43758.5453,f2=h2-Math.floor(h2);return [(f-.5)*.55,(f2-.5)*.5];};
 const corner=(i,j)=>{const [ja,jl]=jitter(i,j),a=(i+(j%2)*.5+ja)*CA,p=roadAt(Math.max(0,(j+jl)*CL));return {x:p.x+ACx*a,y:p.y+ACy*a};};
 for(let j=-1;j*CL<ROAD_LENGTH+CL;j++)for(let i=Math.floor(-(HALF+160)/CA)-2;i<(HALF+160)/CA+1;i++){
  const q=[corner(i,j),corner(i+1,j),corner(i+1,j+1),corner(i,j+1)];
  const cx=(q[0].x+q[1].x+q[2].x+q[3].x)/4,cy=(q[0].y+q[1].y+q[2].y+q[3].y)/4;
  // a rounded stone inside its cell: corners pulled in, edges bowed out a little
  const pts=[];for(let k=0;k<4;k++){const a=q[k],b=q[(k+1)%4];
   for(const t of [.18,.5,.82]){const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,sh=t===.5?.86:.8;pts.push({x:cx+(x-cx)*sh,y:cy+(y-cy)*sh});}}
  const v=rnd(),L=lampLight(cx,cy);
  let col=mix([196,164,162],[226,194,182],v);if(v<.12)col=mix(col,[176,156,170],.5);else if(v>.92)col=mix(col,[222,186,150],.45);
  col=mix(col,[240,208,182],L*.35);
  const path=(dx=0,dy=0,k=1)=>{g.beginPath();pts.forEach((p,n)=>{const x=cx+(p.x-cx)*k+dx,y=cy+(p.y-cy)*k+dy;n?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();};
  g.fillStyle=rgb(mix(col,[96,70,74],.55));path(.6,1.6,1.02);g.fill();     // the lower lip in shadow
  const gr=g.createLinearGradient(cx,cy-12,cx,cy+10);gr.addColorStop(0,rgb(mix(col,[250,226,206],.4)));gr.addColorStop(1,rgb(mix(col,[170,136,140],.3)));
  g.fillStyle=gr;path();g.fill();
  g.fillStyle='rgba(255,240,226,.28)';path(-1.2,-1.6,.62);g.fill();          // a soft lit plane on top
  if(rnd()<.35){g.fillStyle='rgba(120,88,90,.35)';for(let n=0;n<3;n++){g.beginPath();g.arc(cx+(rnd()-.5)*20,cy+(rnd()-.5)*10,.9+rnd()*.8,0,7);g.fill();}}
  if(rnd()<.08){g.strokeStyle='rgba(110,80,84,.45)';g.lineWidth=.9;g.beginPath();g.moveTo(cx-8,cy-3);g.lineTo(cx-1,cy+1);g.lineTo(cx+6,cy-1);g.stroke();}
 }

 // moss and grass in the seams, worn wheel-ruts down the middle
 for(let i=0;i<(low?900:2200);i++){const s=rnd()*ROAD_LENGTH,a=(rnd()-.5)*2*HALF,p=side(s,a),edge=Math.abs(a)/HALF;
  if(rnd()<.35+edge*.6){g.globalAlpha=.75;tuft(p.x,p.y,.2,.55);g.globalAlpha=1;}}
 for(const off of [-48,48]){g.strokeStyle='rgba(90,60,70,.07)';g.lineWidth=16;g.beginPath();for(let s=0;s<ROAD_LENGTH;s+=20){const p=side(s,off);s?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.stroke();}
 g.restore();
 // verge: grass spilling over the road's edges, a few loose stones
 for(const E of [edgeL,edgeR])for(let i=0;i<E.length;i++){const p=E[i];for(let j=0;j<(low?3:6);j++)tuft(p.x+(rnd()-.5)*22,p.y+(rnd()-.5)*10,.4,1.1);
  if(rnd()<.06){const x=p.x+(rnd()-.5)*30,y=p.y+(rnd()-.5)*12;g.fillStyle=INK;g.beginPath();g.ellipse(x,y,9,6,0,0,7);g.fill();g.fillStyle='#8c8090';g.beginPath();g.ellipse(x-.5,y-1,7.5,4.6,0,0,7);g.fill();}}
 const puddles=[],canopies=[];
 if(rain){// puddles in the ruts and by the lamps, holding the sky and the lamplight
  const spots=[];for(let i=0;i<18;i++)spots.push(side(SEAM_S+60+rnd()*(ROAD_LENGTH-SEAM_S-100),(rnd()<.5?-1:1)*48+(rnd()-.5)*30));
  for(const l of ROAD_LAMPS)spots.push({x:l.x+(rnd()-.5)*50,y:l.y+14+rnd()*16});
  for(const p of [[470,1000],[420,1080],[520,1050],[450,930],[380,1040],[560,960]])spots.push({x:p[0],y:p[1]});
  for(const p of spots){const w=18+rnd()*26;puddles.push({x:p.x,y:p.y,w});
   paintPuddle(g,p.x,p.y,w,w*.3,.32);}
 }

 // ---------- things beside the road, back to front ----------
 const things=[],props=[];
 // Trees must not stand over the road: in this view a canopy hangs ~300 above its trunk,
 // over the road further up towards the gate, so every crown is checked against the road.
 const tree=(x,y,o)=>{const sc=o.scale||1,top=(o.h||320)*sc*.78;
  for(const [dx,dy] of [[0,0],[-110*sc,-top],[110*sc,-top],[0,-top-60],[-90*sc,-top+140],[90*sc,-top+140]])if(clear(x+dx,y+dy)<HALF+(dy?24:70))return false;
  props.push({kind:'tree',x,y,h:(o.h||320)*sc,scale:sc,tones:o.tones||['lit','cool','near'],seed:(rnd()*9999)|0});canopies.push({x,y:y-top+40,r:90*sc,floor:y+6});
  for(let j=0;j<(low?5:12);j++){const a=rnd()*7,d=30+rnd()*120;things.push({y:y-1,draw:()=>fallenLeaf(g,rnd,x+Math.cos(a)*d,y+Math.sin(a)*d*.45)});}
  return true;};
 // roadside trees, staggered and in loose pairs, then a dense wood on the west filling the art's flank
 for(let s=SEAM_S+120,i=0;s<ROAD_LENGTH-40;s+=110+rnd()*80,i++){
  const k=i%2?1:-1;
  for(let tries=0;tries<4;tries++){const b=side(s,k*(HALF+90+tries*90+rnd()*60));if(tree(b.x,b.y,{h:280+rnd()*110,lean:(rnd()-.5)*.14,scale:.85+rnd()*.3}))break;}
  if(rnd()<.6){const b2=side(s+50,k*(HALF+340+rnd()*200));tree(b2.x,b2.y,{h:300+rnd()*120,scale:.9+rnd()*.3});}
 }
 for(let i=0;i<(low?36:64);i++){const x=-1380+rnd()*2500,y=700+rnd()*1850;
  if(x>360&&y<1180)continue;   // the art's own forecourt and planting
  tree(x,y,{h:300+rnd()*160,scale:.9+rnd()*.35,tones:['lit','cool','near']});}
 for(let s=SEAM_S+80;s<ROAD_LENGTH;s+=110+rnd()*120){const k=rnd()<.5?-1:1,b=side(s,k*(HALF+40+rnd()*40));props.push({kind:'bush',x:b.x,y:b.y,r:28+rnd()*16,n:3+(rnd()*3|0),seed:(rnd()*9999)|0});}
 // a split-rail fence along the east verge
 const fence=[];for(let s=SEAM_S+300;s<SEAM_S+760;s+=46)fence.push(side(s,HALF+34));
 for(let i=0;i<fence.length;i++){const p=fence[i],q=fence[i+1];things.push({y:p.y,draw:()=>{
  if(q){for(const h of [16,30]){g.strokeStyle=INK;g.lineWidth=6;g.beginPath();g.moveTo(p.x,p.y-h);g.lineTo(q.x,q.y-h);g.stroke();g.strokeStyle='#7a5434';g.lineWidth=3.6;g.beginPath();g.moveTo(p.x,p.y-h);g.lineTo(q.x,q.y-h);g.stroke();}}
  g.fillStyle=INK;g.fillRect(p.x-4,p.y-40,8,42);g.fillStyle='#6a4630';g.fillRect(p.x-2.6,p.y-38,5.2,39);g.fillStyle='#9a6e44';g.fillRect(p.x-2.6,p.y-38,1.6,39);}});}
 // a milestone on the west verge
 {const b=side(SEAM_S+640,-(HALF+30));things.push({y:b.y,draw:()=>{g.fillStyle='rgba(10,8,18,.4)';g.beginPath();g.ellipse(b.x,b.y+2,18,6,0,0,7);g.fill();
  g.fillStyle=INK;g.beginPath();g.moveTo(b.x-14,b.y+2);g.lineTo(b.x-14,b.y-26);g.quadraticCurveTo(b.x,b.y-44,b.x+14,b.y-26);g.lineTo(b.x+14,b.y+2);g.fill();
  g.fillStyle='#9a8c98';g.beginPath();g.moveTo(b.x-11.5,b.y);g.lineTo(b.x-11.5,b.y-25);g.quadraticCurveTo(b.x,b.y-40,b.x+11.5,b.y-25);g.lineTo(b.x+11.5,b.y);g.fill();
  g.fillStyle='#c4b6bc';g.fillRect(b.x-11.5,b.y-25,4,25);g.strokeStyle='#4a3e4c';g.lineWidth=1.4;g.beginPath();g.moveTo(b.x-5,b.y-20);g.lineTo(b.x+5,b.y-20);g.moveTo(b.x-4,b.y-14);g.lineTo(b.x+4,b.y-14);g.stroke();}});}
 for(const l of [...ROAD_LAMPS,ART_LAMP])props.push({kind:'lamp',x:l.x,y:l.y});
 // wildflowers in the verges
 for(let i=0;i<(low?120:300);i++){const s=rnd()*ROAD_LENGTH,b=side(s,(rnd()<.5?-1:1)*(HALF+20+rnd()*160)),col=['#f2efe6','#a9b8f0','#f0d070','#e8a0c0'][(rnd()*4)|0];
  things.push({y:b.y,draw:()=>{for(let j=0;j<4;j++){const x=b.x+(rnd()-.5)*16,y=b.y+(rnd()-.5)*6;g.fillStyle='#22381f';g.fillRect(x-.6,y,1.2,5);g.fillStyle=col;for(const [dx,dy] of [[-1.6,0],[1.6,0],[0,-1.4],[0,1.4]]){g.beginPath();g.arc(x+dx,y+dy,1.5,0,7);g.fill();}g.fillStyle='#e8c040';g.fillRect(x-.6,y-.6,1.2,1.2);}}});}
 things.sort((a,b)=>a.y-b.y);for(const t of things)t.draw();

 // ---------- lamplight ----------
 // the night itself and the lamps' pools are the shared light map (weather-fx.js), laid over the
 // art and this road alike; only a little warmth is baked here, where light meets stone
 g.globalCompositeOperation='lighter';
 for(const l of ROAD_LAMPS){const gr=g.createRadialGradient(l.x,l.y,0,l.x,l.y,150);gr.addColorStop(0,'rgba(255,170,90,.16)');gr.addColorStop(1,'rgba(255,150,80,0)');
  g.save();g.translate(l.x,l.y);g.scale(1,.55);g.translate(-l.x,-l.y);g.fillStyle=gr;g.fillRect(l.x-150,l.y-150,300,300);g.restore();}
 g.globalCompositeOperation='source-over';
 return {canvas:c,scale:S,puddles,canopies,props};
}

// The plate is cut where its generated filler begins: below y≈1108 (a mirrored strip) and
// the smeared wedge west of the forecourt. Edges are feathered so the road shows through.
export function trimPlate(img){
 const c=canvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);
 // Mask coordinates remain scene units even when the source image has twice the pixels.
 g.save();g.scale(img.width/1181,img.height/1260);
 g.globalCompositeOperation='destination-out';
 const cut=[[0,768],[150,780],[298,822],[346,858],[424,858],[470,892],[560,930],[628,962],[604,990],[545,1028],[492,1078],[478,1110],[478,1260],[0,1260]];
 const poly=()=>{g.beginPath();cut.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
 poly();g.fillStyle='#000';g.fill();
 g.lineJoin='round';for(const [w,a] of [[14,.3],[7,.5]]){poly();g.lineWidth=w;g.strokeStyle=`rgba(0,0,0,${a})`;g.stroke();}
 const gr=g.createLinearGradient(0,1072,0,1116);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'#000');g.fillStyle=gr;g.fillRect(0,1072,1181,1260-1072);
 g.restore();g.globalCompositeOperation='source-over';
 // HD artwork already contains the offline edge pass. Do not sharpen it twice.
 if(img.width<=1181)sharpen(c,.55);
 return c;
}

// The art is 1181 px wide and the close views magnify it 2–3×, where it went soft beside the
// crisp pixel figure and the painted foliage: one mild unsharp mask at load restores its edges
// without repainting it.
function sharpen(c,amount){
 const w=c.width,h=c.height,g=c.getContext('2d'),b=canvas(w/2,h/2),bg=b.getContext('2d');
 bg.drawImage(c,0,0,b.width,b.height);
 const blur=canvas(w,h),blg=blur.getContext('2d');blg.drawImage(b,0,0,w,h);
 const o=g.getImageData(0,0,w,h),s=blg.getImageData(0,0,w,h).data,d=o.data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;for(let k=0;k<3;k++){const v=d[i+k];d[i+k]=v+(v-s[i+k])*amount;}}
 g.putImageData(o,0,0);
}
