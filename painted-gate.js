// The gate scene in the chosen hand-painted look. The castle, wall, steps and middle-ground
// planting are the 05 gate art (with its baked title, guard and dialogue removed); on top of
// it, live layers that the still cannot do:
//  · the two door leaves, cut from the art and turned about their real hinge lines, with the
//    a neutral, unbuilt opening behind them;
//  · the pixel guard with eight genuine walking views (pixel-guard.js), lit by the same lamps, on a contact shadow;
//  · two foreground trees and hedges that sway and shed leaves, framing the view;
// All positions are scene px of the art (1181×1260 including a band below it).
import {clamp,smooth} from './journey.js';
import {makeTree,makeBush,makeLeaves,RES} from './painted-flora.js';
import {createPixelGuard} from './pixel-guard.js';
import {paintPuddle,paintLampPost,roadAt,roadClearance,APPROACH,ROAD_LENGTH,ROAD_HALF,SEAM_S,ROAD_LAMPS,trimPlate} from './approach-road.js';

export const WORLD={w:1181,h:1260,art:1120};
export const SPOTS={stand:{x:534,y:910},door:{x:678,y:830},aside:{x:578,y:872},near:{x:604,y:884}};
export const LAMPS=[{x:458,y:556,kind:'lamp'},{x:549,y:613,kind:'lantern'},{x:770,y:712,kind:'lamp'},{x:395,y:974,kind:'lamp'}];
export const WINDOWS=[[345,385],[387,232],[840,355],[988,476],[1000,658],[1168,600],[83,135],[125,22],[228,62],[893,180],[1100,165],[955,255],[835,22],[700,345,'clock']];
// door: the opening (hole mask origin), each leaf's texture origin, its hinge foot and the
// vector along the wall from the hinge to the meeting stile
const HOLE={x:604,y:536,w:150,h:296};
// every lamp the light layer draws: flame (x,y), the foot of its light on the ground (fx,fy), reach r
const FX_LAMPS=[{x:458,y:556,fx:458,fy:728,r:230,cone:1},{x:549,y:613,fx:560,fy:760,r:170,kind:'lantern'},{x:770,y:712,fx:770,fy:834,r:220,cone:1},{x:395,y:974,fx:396,fy:1150,r:240,cone:1},
 ...ROAD_LAMPS.map(l=>({x:l.x,y:l.head.y+4,fx:l.onRoad.x,fy:l.onRoad.y,r:240,cone:1}))];
const EAVES=[[640,552,800],[722,580,822],[549,642,762],[458,592,728],[770,744,834],[395,1002,1118]];
const LEAF={L:{tex:[608,538],hinge:[613,778],to:[75,25.95]},R:{tex:[686,538],hinge:[746,824],to:[-58,-20.1]}};
const STILE=688;
// one unit of depth into the gatehouse, on screen (the floor recedes up and to the right)
const DEPTH=[.42,-.33];
const PASSAGE=130;
export const MAX_DOOR=1.95;

function canvas(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;}
function maskBy(c,mask,dx=0,dy=0){const g=c.getContext('2d');g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='destination-in';g.drawImage(mask,dx*RES,dy*RES,HOLE.w*RES,HOLE.h*RES);g.restore();}

// No proposed town art is visible through the opened leaves. The dark opening is
// deliberately neutral until the actual town design has been chosen.
function paintPassage(mask){
 const c=canvas(HOLE.w*RES,HOLE.h*RES),g=c.getContext('2d');g.scale(RES,RES);
 const shade=g.createLinearGradient(0,0,0,HOLE.h);
 shade.addColorStop(0,'#171724');shade.addColorStop(.55,'#171421');shade.addColorStop(1,'#332a31');
 g.fillStyle=shade;g.fillRect(0,0,HOLE.w,HOLE.h);
 maskBy(c,mask);
 return c;
}

// a leaf turned by `angle` (0 shut … MAX_DOOR) about its hinge: the hinge edge stays, the
// meeting stile swings into the passage; this is the transform from art px to art px
function leafMatrix(s,angle){
 const f=LEAF[s],[lx,ly]=f.to,len=Math.hypot(lx,ly),c=Math.cos(angle),n=Math.sin(angle);
 const ex=c*lx+n*len*DEPTH[0],ey=c*ly+n*len*DEPTH[1];
 return {a:ex/lx,b:(ey-ly)/lx,hx:f.hinge[0],hy:f.hinge[1]};
}
const apply=(m,x,y)=>({x:m.hx+m.a*(x-m.hx),y:m.hy+m.b*(x-m.hx)+(y-m.hy)});
// Shared by rendering, contact animation and geometry regression tests.
export function doorLeafPoint(s,angle,u,h){const f=LEAF[s],m=leafMatrix(s,angle),x=f.hinge[0]+f.to[0]*u,y=f.hinge[1]+f.to[1]*u-h;return apply(m,x,y);}

export function createGate(scene,{images,weather,quality}){
 const low=quality==='low',objs=[],add=o=>(objs.push(o),o);
 const T=(key,img)=>{if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addImage(key,img);scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);return key;};
 const TC=(key,c)=>{if(scene.textures.exists(key))scene.textures.remove(key);const t=scene.textures.addCanvas(key,c);t.setFilter(Phaser.Textures.FilterMode.LINEAR);return t;};
 // the road out to the south-west lies under the art; the art's filler band and wedge are cut away
 {const key='gate-approach',a=images.approach;if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addCanvas(key,a.canvas).setFilter(Phaser.Textures.FilterMode.LINEAR);
  add(scene.add.image(APPROACH.x,APPROACH.y,key).setOrigin(0,0).setScale(1/a.scale).setDepth(-1));}
 TC('gate-plate',trimPlate(images.plate));
 add(scene.add.image(0,0,'gate-plate').setOrigin(0,0).setDepth(0));
 // soft shadow texture for the guard and props
 {const c=canvas(128,32),g=c.getContext('2d'),r=g.createRadialGradient(64,16,0,64,16,64);r.addColorStop(0,'rgba(8,6,16,.9)');r.addColorStop(.55,'rgba(8,6,16,.45)');r.addColorStop(1,'rgba(8,6,16,0)');g.setTransform(1,0,0,.25,0,12);g.fillStyle=r;g.fillRect(0,-48,128,128);TC('g-shadow',c);}
 // wet night: the dry painting gets a cool sheen, warm reflections under each lamp and a few puddles
 const puddles=[];
 if(weather==='rain'){
  const c=canvas(WORLD.w/2,WORLD.h/2),g=c.getContext('2d');g.scale(.5,.5);
  // only on level ground: the forecourt, not the steps
  for(const [x,y,w,h] of [[470,1000,58,14],[560,950,44,10],[420,1080,40,10],[520,1060,50,12],[450,925,30,7],[380,1040,30,7]]){
   paintPuddle(g,x,y,w,h);puddles.push({x,y,w});}
  // the whole forecourt is wet: a faint cool gloss over the stone, strongest where it is level
  {const gr=g.createRadialGradient(560,960,0,560,960,320);gr.addColorStop(0,'rgba(150,170,220,.13)');gr.addColorStop(1,'rgba(150,170,220,0)');g.save();g.translate(560,960);g.scale(1.6,.7);g.translate(-560,-960);g.fillStyle=gr;g.fillRect(200,600,720,720);g.restore();}
  const wet=TC('gate-wet',c);
  add(scene.add.image(0,0,'gate-wet').setOrigin(0,0).setScale(2).setDepth(.5));
  puddles.push(...images.approach.puddles);
 }

 // ---------- doorway ----------
 // the opening's mask is stored as greyscale; masking needs it as alpha
 const hole=(()=>{const im=images.hole,c=canvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height);
  for(let i=0;i<d.data.length;i+=4){d.data[i+3]=d.data[i];d.data[i]=d.data[i+1]=d.data[i+2]=255;}g.putImageData(d,0,0);return c;})();
 const passage=paintPassage(hole);
 const dark={};for(const s of ['L','R']){const im=s==='L'?images.doorL:images.doorR,c=canvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='#0c0814';g.fillRect(0,0,c.width,c.height);dark[s]=c;}
 const dc=canvas(HOLE.w*RES,HOLE.h*RES),dg=dc.getContext('2d');const dTex=TC('gate-doorway',dc);
 const doorway=add(scene.add.image(HOLE.x,HOLE.y,'gate-doorway').setOrigin(0,0).setScale(1/RES).setDepth(2).setVisible(false));
 let lastAngle=-1;
 function drawDoor(angle){
  if(Math.abs(angle-lastAngle)<.002)return;lastAngle=angle;
  doorway.setVisible(angle>.002);if(angle<=.002)return;
  dg.setTransform(1,0,0,1,0,0);dg.clearRect(0,0,dc.width,dc.height);dg.drawImage(passage,0,0);
  for(const s of ['L','R']){const m=leafMatrix(s,angle),im=s==='L'?images.doorL:images.doorR,[tx,ty]=LEAF[s].tex;
   const hx=m.hx-HOLE.x;
   // in hole-local px: x' = hx + a(x-hx), y' = y + b(x-hx)
   dg.setTransform(RES*m.a,RES*m.b,0,RES,RES*(hx-m.a*hx),-RES*m.b*hx);
   dg.drawImage(im,tx-HOLE.x,ty-HOLE.y);
   // turning away from the lamps, the wood darkens
   dg.globalAlpha=clamp(Math.sin(Math.min(angle,1.57))*.55+Math.max(0,angle-1.57)*.4,0,.8);dg.drawImage(dark[s],tx-HOLE.x,ty-HOLE.y);dg.globalAlpha=1;
   // the leaf's thickness along the meeting stile
   const top=apply(m,STILE,560),bot=apply(m,STILE,s==='L'?806:808);
   dg.setTransform(RES,0,0,RES,0,0);dg.strokeStyle='#2a170e';dg.lineWidth=2.4*Math.min(1,angle*2);dg.beginPath();dg.moveTo(top.x-HOLE.x,top.y-HOLE.y);dg.lineTo(bot.x-HOLE.x,bot.y-HOLE.y);dg.stroke();
  }
  maskBy(dc,hole);
  dTex.refresh();
 }
 // a point on a leaf: u across from the hinge (0…1), h above the sill — where his palms go
 const leafPoint=doorLeafPoint;

 // ---------- the guard ----------
 const guard=createPixelGuard(scene,{depth:10,sheet:images.guardSheet,rims:images.guardRims,meta:images.guardMeta});objs.push(guard);
 // warmth, which side the lamps are on, and the ground direction a shadow is cast in
 function lightAt(x,y){let warm=0,side=0,dx=0,dy=0;for(const l of FX_LAMPS){const d=Math.hypot(l.x-x,(l.y-(y-70))*1.4),k=1/(1+(d/150)**2);warm+=k;side+=(l.x-x)/Math.max(60,d)*k;
   // Sample the torso, use each lamp's actual ground point, and cross lamp centres
   // continuously instead of abruptly swapping the lit side with Math.sign().
   const fx=x-l.fx,fy=y-l.fy,n=Math.hypot(fx,fy)||1;dx+=fx/n*k;dy+=fy/n*k;}
  return {warm:clamp(warm*.9),side:clamp(side/(warm||1),-1,1),dx,dy};}

 // ---------- foreground planting ----------
 const light=[.75,-.65];
 const flora=[];
 const treeA=makeTree(scene,{x:10,y:1190,depth:30,seed:3,light,trunk:{h:380,lean:.1,limbs:[[.62,-60,-50,12],[.75,80,-60,11],[.55,110,-20,9]]},
  clumps:[[-20,-560,72,'lit'],[90,-600,78,'lit'],[190,-540,66,'lit'],[10,-450,78,'cool'],[130,-470,82,'cool'],[235,-430,58,'cool'],[60,-380,70,'cool']]});
 treeA.floor=1160;flora.push(treeA);
 const treeB=makeTree(scene,{x:1120,y:1250,depth:30,seed:9,light:[-.7,-.7],trunk:{h:330,lean:-.08,limbs:[[.6,-90,-50,12],[.5,50,-40,10]]},
  clumps:[[-140,-380,68,'lit'],[-40,-420,82,'lit'],[60,-380,72,'cool'],[-170,-280,68,'cool'],[-60,-300,82,'cool'],[50,-260,76,'near'],[-120,-180,66,'near']]});
 treeB.floor=1255;flora.push(treeB);
 // hedges along the bottom: the west mass stands beside the road now, which runs on out of the view
 const hedgeL=makeBush(scene,{x:0,y:1200,depth:31,seed:21,light,clumps:[[60,-350,78,'cool',.8],[170,-370,72,'cool',.8],[285,-330,62,'cool',.8],[335,-255,50,'near',.8],[40,-225,88,'near',.8],[160,-235,82,'near',.8],[70,-85,92,'near',.75],[-40,-10,88,'near',.75],[-10,80,80,'near',.7],[-120,60,84,'near',.7]].filter(([dx,dy,r])=>roadClearance(dx,1200+dy)>ROAD_HALF+r*.7)});
 const hedgeR=makeBush(scene,{x:600,y:1200,depth:31,seed:33,light:[-.7,-.7],clumps:[[20,30,58,'near',.75],[120,10,66,'near',.75],[240,-10,70,'near',.75],[360,10,66,'near',.75],[460,-20,74,'near',.75],[560,0,66,'near',.75],[180,60,74,'near',.7],[400,70,78,'near',.7]]});
 flora.push(hedgeL,hedgeR);objs.push(...flora);
 // clumps near a lamp take its warmth, lit from above; the rest stay cool and deep
 for(const f of flora)for(const p of f.parts){let k=0;for(const l of FX_LAMPS){const d=Math.hypot(l.x-p.x,(l.y-p.y)*1.2);k+=1/(1+(d/(l.r*.7))**2);}k=clamp(k);
  // the framing trees sit above the shared night map (depth) and carry their own night grade,
  // so their painted leaf masses keep their texture instead of sinking into black
  const C=Phaser.Display.Color.GetColor,top=C(150+k*105,150+k*76,196-k*18),low=C(104+k*70,112+k*48,156-k*16);
  p.im.setTint(top,top,low,low);}
 for(const f of flora)for(const o of f.objs)o.setDepth(o.depth+4.6);
 for(const f of flora)for(const o of f.objs)if(!f.parts.some(p=>p.im===o))o.setTint(0x8a7c9c);
 // ---------- the old road's trees, bushes and lamps: live, so they sway and shed leaves ----------
 // They stand under the shared night map, sorted by their feet; a few painted clumps are shared.
 const cache=new Map(),roadside=[],at=y=>-.9+y*1e-4;
 {const c=canvas(64*RES,240*RES),g=c.getContext('2d');g.scale(RES,RES);paintLampPost(g,32,232);TC('road-lamp',c);}
 for(const p of images.approach.props){
  if(p.kind==='lamp'){add(scene.add.image(p.x,p.y+8,'road-lamp').setOrigin(.5,232/240).setScale(1/RES).setDepth(at(p.y)));continue;}
  const sc=p.scale||1,lt=[.7,-.7];let t;
  if(p.kind==='tree'){const top=p.h*.78,R=62*sc,tones=p.tones,rr=k=>R*k*(.9+((p.seed*7+k*13)%10)/50);
   const cl=[[-80,-top-10,.9,0],[20,-top-60,1,0],[100,-top-5,.85,0],[-50,-top+80,1,1],[60,-top+70,1.05,1],[-110,-top+140,.8,2],[10,-top+150,.95,2],[110,-top+120,.75,2]]
    .filter((_,i)=>(p.seed>>i)%7!==0).map(([dx,dy,k,ti])=>[dx*sc,dy,rr(k),tones[ti]]);
   t=makeTree(scene,{x:p.x,y:p.y,depth:at(p.y),seed:p.seed,light:lt,cache,trunk:{h:p.h},clumps:cl});}
  else t=makeBush(scene,{x:p.x,y:p.y,depth:at(p.y),seed:p.seed,light:lt,cache,clumps:Array.from({length:p.n},(_,i)=>[(i-(p.n-1)/2)*p.r*.9,-p.r*.5,p.r*(.85+((p.seed+i)%5)*.08),i>p.n/2?'near':'cool',.8])});
  t.floor=p.y+4;t.box={x0:p.x-170*sc,x1:p.x+170*sc,y0:p.y-(p.h||80)-90,y1:p.y+20};t.inView=false;roadside.push(t);objs.push(t);
 }
 const leaves=makeLeaves(scene,{trees:[treeA,treeB,hedgeL,hedgeR,...roadside.filter(t=>t.box.y1-t.box.y0>200)],depth:36.6,rate:low?.8:1.8,low,rain:weather==='rain',tint:0xb8a8b8});objs.push(leaves);
 // crowns for fireflies and drips: the foreground trees' own clumps and the roadside trees
 const canopies=[...[treeA,treeB].flatMap(t=>t.parts.filter((_,i)=>i%2===0).map(p=>({x:p.x,y:p.y,r:p.r,floor:t.floor}))),...images.approach.canopies];

 // ---------- camera framing ----------
 // A view is a box of the scene to show, fitted into the part of the screen left free by the
 // dialogue; never zoomed out past filling the screen, never past the scene's edge.
 function fit(box,screen,safe,bounds){
  const {w,h}=screen,cover=Math.max(w/bounds.w,h/bounds.h);
  let z=Math.max(cover,Math.min(safe.w/box.w,safe.h/box.h)),cx=box.x+box.w/2+(w/2-(safe.x+safe.w/2))/z,cy=box.y+box.h/2+(h/2-(safe.y+safe.h/2))/z;
  const hw=w/2/z,hh=h/2/z;cx=clamp(cx,bounds.x+hw,bounds.x+bounds.w-hw);cy=clamp(cy,bounds.y+hh,bounds.y+bounds.h-hh);return {x:cx,y:cy,z};
 }
 const cam={x:600,y:900,z:1,init:false};
 function view(mode,screen,{talking=false,advance=1,enter=0}={}){
  const {w,h}=screen,portrait=h>w*1.15;
  const safe=talking?(portrait?{x:0,y:h*.06,w,h:h*.5}:{x:w*.3,y:h*.08,w:w*.66,h:h*.6}):{x:0,y:h*.08,w,h:h*.86};
  const B={x:0,y:0,w:WORLD.w,h:WORLD.h};
  let box;
  // Keep the whole approach and both feet visible while walking; only move
  // closer once he has stopped at the leaves. World-space body size is constant.
  if(mode==='approach')box={x:420,y:470,w:440,h:490};
  else if(mode==='door')box={x:510,y:490,w:350,h:450};
  else if(talking)box=portrait?{x:440,y:560,w:330,h:380}:{x:420,y:470,w:420,h:480};
  else box=portrait?{x:400,y:420,w:440,h:560}:{x:330,y:330,w:620,h:640};
  let v=fit(box,screen,safe,B);
  if(advance<1){
   // the arrival travels up the old road: from far down it, looking ahead to the gate, to the steps
   const wide={x:APPROACH.x,y:0,w:WORLD.w-APPROACH.x,h:APPROACH.y+APPROACH.h},e=advance,cut=.8;
   const along=s=>{const p=roadAt(s),bx=portrait?520:900,by=portrait?780:600;
    return fit({x:p.x-p.dx*170-bx/2,y:p.y-p.dy*170-by/2-40,w:bx,h:by},screen,safe,wide);};
   const s0=ROAD_LENGTH-300,s1=SEAM_S-30;
   const road=along(s0+(s1-s0)*Math.min(1,e/cut));
   if(e<cut)v=road;else{const k=smooth((e-cut)/(1-cut));v={x:road.x+(v.x-road.x)*k,y:road.y+(v.y-road.y)*k,z:road.z*Math.pow(v.z/road.z,k)};}
  }
  if(enter>0){// through the gate: towards the far arch until it fills the screen
   const fx=680+DEPTH[0]*PASSAGE,fy=690+DEPTH[1]*PASSAGE,zf=Math.max(w/120,h/220),e=smooth(enter);
   v={x:v.x+(fx-v.x)*e,y:v.y+(fy-v.y)*e,z:v.z*Math.pow(zf/v.z,e*e)};}
  return v;
 }
 function aim(target,dt,snap){
  if(!cam.init||snap){Object.assign(cam,target,{init:true});return cam;}
  const k=1-Math.exp(-dt*2.6);cam.x+=(target.x-cam.x)*k;cam.y+=(target.y-cam.y)*k;cam.z*=Math.pow(target.z/cam.z,k);return cam;
 }

 let t=0;
 return {
  // what the light and weather layer needs (weather-fx.js)
  fx:{lamps:FX_LAMPS,windows:WINDOWS,puddles,canopies,eaves:EAVES,bounds:{x:APPROACH.x,y:-200,w:WORLD.w-APPROACH.x,h:APPROACH.y+APPROACH.h+200},streetLights:[]},
  view,aim,cam,leafPoint,lightAt,guard,
  // st: {door, guard:{...}, wind}
  update(dt,st){
   t+=dt;const wind=1+.35*Math.sin(t*.37)+.2*Math.sin(t*1.13);
   drawDoor(st.door||0);
   if(st.guard){const L=lightAt(st.guard.x,st.guard.y);guard.update(dt,{...st.guard,light:L,wind});}else guard.hide();
   for(const f of flora)f.update(dt,wind);
   // the roadside trees sway only while in view (and only those shed leaves)
   {const v=scene.cameras.main.worldView;for(const r of roadside){const b=r.box;r.inView=b.x1>v.x&&b.x0<v.x+v.width&&b.y1>v.y&&b.y0<v.y+v.height;if(r.inView)r.update(dt,wind);}}
   leaves.update(dt,wind);
  },
  destroy(){for(const o of objs)o.destroy();}
 };
}
