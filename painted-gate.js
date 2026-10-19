// The gate scene in the chosen hand-painted look. The castle, wall, steps and middle-ground
// planting are the 05 gate art (with its baked title, guard and dialogue removed); on top of
// it, live layers that the still cannot do:
//  · the two door leaves, cut from the art and turned about their real hinge lines, with the
//    passage and the lit street beyond painted behind them;
//  · the guard, cut in layers from the user's chibi art (guard-puppet.js), lit by the same lamps, on a contact shadow;
//  · two foreground trees and hedges that sway and shed leaves, framing the view;
//  · the street inside (street-scene.js), where the camera ends up after the gate.
// All positions are scene px of the art (1181×1260 including a band below it).
import {clamp,smooth} from './journey.js';
import {makeTree,makeBush,makeLeaves,RES} from './painted-flora.js';
import {createChibi} from './guard-puppet.js';
import {paintStreet,paintFolk,STREET,STREET_LAMPS,FOLK,STREET_TREES,iso as siso} from './street-scene.js';

export const WORLD={w:1181,h:1260,art:1120};
export const STREET_AT={x:1400,y:0};          // the street sits to the right of the gate in world space
export const SPOTS={stand:{x:534,y:910},door:{x:678,y:830},aside:{x:578,y:872},near:{x:604,y:884}};
export const LAMPS=[{x:458,y:556,kind:'lamp'},{x:549,y:613,kind:'lantern'},{x:770,y:712,kind:'lamp'},{x:395,y:974,kind:'lamp'}];
export const WINDOWS=[[345,385],[387,232],[840,355],[988,476],[1000,658],[1168,600],[83,135],[125,22],[228,62],[893,180],[1100,165],[955,255],[835,22],[700,345,'clock']];
// door: the opening (hole mask origin), each leaf's texture origin, its hinge foot and the
// vector along the wall from the hinge to the meeting stile
const HOLE={x:604,y:536,w:150,h:296};
const LEAF={L:{tex:[608,538],hinge:[613,778],to:[75,25.95]},R:{tex:[686,538],hinge:[746,824],to:[-58,-20.1]}};
const STILE=688;
// one unit of depth into the gatehouse, on screen (the floor recedes up and to the right)
const DEPTH=[.42,-.33];
const PASSAGE=130;
export const MAX_DOOR=1.95;

function canvas(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;}
function maskBy(c,mask,dx=0,dy=0){const g=c.getContext('2d');g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='destination-in';g.drawImage(mask,dx*RES,dy*RES,HOLE.w*RES,HOLE.h*RES);g.restore();}

// the passage behind the doors: the left inner wall, the floor, and through the far arch the
// street, in hole-local scene px
function paintPassage(mask,street,weather){
 const c=canvas(HOLE.w*RES,HOLE.h*RES),g=c.getContext('2d');g.scale(RES,RES);
 const off=[DEPTH[0]*PASSAGE,DEPTH[1]*PASSAGE];
 g.fillStyle='#120e18';g.fillRect(0,0,HOLE.w,HOLE.h);
 // far arch: a window onto the square, the shape of the near arch moved back along the passage
 const far=canvas(HOLE.w*RES,HOLE.h*RES),fg=far.getContext('2d');
 const S=street.scale;   // the square beyond: the feast table and the houses behind it
 fg.drawImage(street.canvas,560*S,230*S,HOLE.w*1.2*S,HOLE.h*1.2*S,0,0,HOLE.w*1.2*RES,HOLE.h*1.2*RES);
 if(weather==='rain'){fg.strokeStyle='rgba(200,214,240,.35)';fg.lineWidth=RES*.8;for(let i=0;i<60;i++){const x=Math.random()*far.width,y=Math.random()*far.height;fg.beginPath();fg.moveTo(x,y);fg.lineTo(x-2*RES,y+14*RES);fg.stroke();}}
 maskBy(far,mask,off[0],off[1]);
 g.drawImage(far,0,0,HOLE.w,HOLE.h);
 // floor: flagstones from the threshold back to the far arch, lit from the square
 const L0=[LEAF.L.hinge[0]-HOLE.x,LEAF.L.hinge[1]-HOLE.y],R0=[LEAF.R.hinge[0]-HOLE.x,LEAF.R.hinge[1]-HOLE.y];
 const P=(p,k)=>({x:p[0]+off[0]*k,y:p[1]+off[1]*k});
 const floor=()=>{g.beginPath();g.moveTo(L0[0],L0[1]);g.lineTo(R0[0],R0[1]);g.lineTo(P(R0,1).x,P(R0,1).y);g.lineTo(P(L0,1).x,P(L0,1).y);g.closePath();};
 const fl=g.createLinearGradient(L0[0],L0[1],P(L0,1).x,P(L0,1).y);fl.addColorStop(0,'#2e2630');fl.addColorStop(.7,'#6a5050');fl.addColorStop(1,'#b48462');
 floor();g.fillStyle=fl;g.fill();
 g.save();floor();g.clip();g.strokeStyle='rgba(16,12,20,.55)';g.lineWidth=1;
 for(let k=0;k<=1;k+=.12){const a=P(L0,k),b=P(R0,k);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
 for(let u=0;u<=1;u+=.2){const a={x:L0[0]+(R0[0]-L0[0])*u,y:L0[1]+(R0[1]-L0[1])*u};g.beginPath();g.moveTo(a.x,a.y);g.lineTo(a.x+off[0],a.y+off[1]);g.stroke();}
 g.restore();
 // left wall of the passage, coursed stone, warm towards the square
 const wallTop=14,wall=()=>{g.beginPath();g.moveTo(L0[0],L0[1]);g.lineTo(L0[0],wallTop);g.lineTo(P([L0[0],wallTop],1).x,P([L0[0],wallTop],1).y);g.lineTo(P(L0,1).x,P(L0,1).y);g.closePath();};
 const wl=g.createLinearGradient(L0[0],0,L0[0]+off[0],0);wl.addColorStop(0,'#2a2230');wl.addColorStop(.75,'#5e4650');wl.addColorStop(1,'#a07a66');
 wall();g.fillStyle=wl;g.fill();
 g.save();wall();g.clip();g.strokeStyle='rgba(14,10,18,.6)';g.lineWidth=1;
 for(let y=wallTop;y<L0[1];y+=11){g.beginPath();g.moveTo(L0[0],y);g.lineTo(L0[0]+off[0],y+off[1]);g.stroke();
  for(let k=((y/11)%2)*.1;k<1;k+=.2){const x=L0[0]+off[0]*k,yy=y+off[1]*k;g.beginPath();g.moveTo(x,yy);g.lineTo(x,yy+11);g.stroke();}}
 g.restore();
 // the square's light spilling down the passage
 g.globalCompositeOperation='lighter';const sp=g.createRadialGradient(P(L0,1).x+30,P(L0,1).y,0,P(L0,1).x+30,P(L0,1).y,110);sp.addColorStop(0,'rgba(255,170,90,.32)');sp.addColorStop(1,'rgba(255,150,80,0)');g.fillStyle=sp;g.fillRect(0,0,HOLE.w,HOLE.h);
 g.globalCompositeOperation='source-over';
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

export function createGate(scene,{images,weather,quality}){
 const low=quality==='low',objs=[],add=o=>(objs.push(o),o);
 const T=(key,img)=>{if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addImage(key,img);scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);return key;};
 const TC=(key,c)=>{if(scene.textures.exists(key))scene.textures.remove(key);const t=scene.textures.addCanvas(key,c);t.setFilter(Phaser.Textures.FilterMode.LINEAR);return t;};
 add(scene.add.image(0,0,T('gate-plate',images.plate)).setOrigin(0,0).setDepth(0));
 // soft shadow texture for the guard and props
 {const c=canvas(128,32),g=c.getContext('2d'),r=g.createRadialGradient(64,16,0,64,16,64);r.addColorStop(0,'rgba(8,6,16,.9)');r.addColorStop(.55,'rgba(8,6,16,.45)');r.addColorStop(1,'rgba(8,6,16,0)');g.setTransform(1,0,0,.25,0,12);g.fillStyle=r;g.fillRect(0,-48,128,128);TC('g-shadow',c);}
 // wet night: the dry painting gets a cool sheen, warm reflections under each lamp and a few puddles
 const puddles=[];
 if(weather==='rain'){
  const c=canvas(WORLD.w/2,WORLD.h/2),g=c.getContext('2d');g.scale(.5,.5);
  for(const [x,y,w,h] of [[470,1000,58,14],[560,950,44,10],[640,858,50,10],[420,1080,40,10],[700,880,36,8],[520,1060,50,12]]){
   const gr=g.createLinearGradient(0,y-h,0,y+h);gr.addColorStop(0,'rgba(120,140,190,.55)');gr.addColorStop(1,'rgba(60,70,110,.5)');g.fillStyle=gr;g.beginPath();g.ellipse(x,y,w,h,0,0,7);g.fill();
   g.strokeStyle='rgba(200,215,245,.35)';g.lineWidth=1.5;g.beginPath();g.ellipse(x,y,w,h,0,Math.PI*1.05,Math.PI*1.9);g.stroke();puddles.push({x,y});}
  const wet=TC('gate-wet',c);
  add(scene.add.image(0,0,'gate-wet').setOrigin(0,0).setScale(2).setDepth(.5));
  add(scene.add.rectangle(0,0,WORLD.w,WORLD.h,0xb4bedc).setOrigin(0,0).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(.4));
  const rc=canvas(64,256),rg=rc.getContext('2d'),gr=rg.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(255,190,110,.75)');gr.addColorStop(1,'rgba(255,190,110,0)');rg.fillStyle=gr;
  rg.beginPath();rg.ellipse(32,128,26,128,0,0,7);rg.fill();TC('lamp-reflect',rc);
  for(const l of [...LAMPS,{x:680,y:690,kind:'door'}]){const y0=l.kind==='lantern'?760:l.kind==='door'?830:l.y+(l.kind==='lamp'&&l.y>900?140:170);
   add(scene.add.image(l.x,y0,'lamp-reflect').setOrigin(.5,0).setDisplaySize(l.kind==='door'?60:20,l.kind==='door'?80:110).setBlendMode(Phaser.BlendModes.ADD).setAlpha(l.kind==='door'?0:.45).setDepth(.6).setName('reflect-'+l.kind));}
 }

 // ---------- doorway ----------
 // the opening's mask is stored as greyscale; masking needs it as alpha
 const hole=(()=>{const im=images.hole,c=canvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height);
  for(let i=0;i<d.data.length;i+=4){d.data[i+3]=d.data[i];d.data[i]=d.data[i+1]=d.data[i+2]=255;}g.putImageData(d,0,0);return c;})();
 const passage=paintPassage(hole,images.street,weather);
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
 function leafPoint(s,angle,u,h){const f=LEAF[s],m=leafMatrix(s,angle),x=f.hinge[0]+f.to[0]*u,y=f.hinge[1]+f.to[1]*u-h;return apply(m,x,y);}

 // ---------- the guard ----------
 const guard=createChibi(scene,{depth:10,atlas:images.guardAtlas,meta:images.guardMeta});objs.push(guard);
 function lightAt(x,y){let warm=0,side=0;for(const l of LAMPS){const d=Math.hypot(l.x-x,(l.y-y)*1.4),k=1/(1+(d/150)**2);warm+=k;side+=Math.sign(l.x-x)*k;}return {warm:clamp(warm*.9),side:clamp(side/(warm||1),-1,1)};}

 // ---------- foreground planting ----------
 const light=[.75,-.65];
 const flora=[];
 const treeA=makeTree(scene,{x:70,y:1180,depth:30,seed:3,light,trunk:{h:380,lean:.1,limbs:[[.62,-60,-50,12],[.75,80,-60,11],[.55,110,-20,9]]},
  clumps:[[-20,-560,72,'lit'],[90,-600,78,'lit'],[190,-540,66,'lit'],[10,-450,78,'cool'],[130,-470,82,'cool'],[235,-430,58,'cool'],[60,-380,70,'cool']]});
 treeA.floor=1150;flora.push(treeA);
 const treeB=makeTree(scene,{x:1120,y:1250,depth:30,seed:9,light:[-.7,-.7],trunk:{h:330,lean:-.08,limbs:[[.6,-90,-50,12],[.5,50,-40,10]]},
  clumps:[[-140,-380,68,'lit'],[-40,-420,82,'lit'],[60,-380,72,'cool'],[-170,-280,68,'cool'],[-60,-300,82,'cool'],[50,-260,76,'near'],[-120,-180,66,'near']]});
 treeB.floor=1255;flora.push(treeB);
 // hedges along the bottom: thick on the left where they hide the edge of the art, the path left open
 const hedgeL=makeBush(scene,{x:0,y:1200,depth:31,seed:21,light,clumps:[[60,-350,78,'cool',.8],[170,-370,72,'cool',.8],[285,-330,62,'cool',.8],[335,-255,50,'near',.8],[40,-225,88,'near',.8],[160,-235,82,'near',.8],[280,-180,68,'near',.8],[70,-85,92,'near',.75],[200,-65,88,'near',.75],[320,-60,60,'near',.75],[120,40,88,'near',.7],[260,45,80,'near',.7]]});
 const hedgeR=makeBush(scene,{x:600,y:1200,depth:31,seed:33,light:[-.7,-.7],clumps:[[20,30,58,'near',.75],[120,10,66,'near',.75],[240,-10,70,'near',.75],[360,10,66,'near',.75],[460,-20,74,'near',.75],[560,0,66,'near',.75],[180,60,74,'near',.7],[400,70,78,'near',.7]]});
 flora.push(hedgeL,hedgeR);objs.push(...flora);
 const leaves=makeLeaves(scene,{trees:[treeA,treeB],depth:32,rate:low?.35:.7,low,rain:weather==='rain'});objs.push(leaves);

 // ---------- the street inside ----------
 const street=images.street;
 {const key='street';if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addCanvas(key,street.canvas).setFilter(Phaser.Textures.FilterMode.LINEAR);
  add(scene.add.image(STREET_AT.x,STREET_AT.y,key).setOrigin(0,0).setScale(1/street.scale).setDepth(0));}
 const folk=FOLK.map((f,i)=>{const p=siso(f.X,f.Y),key='folk-'+i,pf=paintFolk(f);if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addCanvas(key,pf.canvas).setFilter(Phaser.Textures.FilterMode.LINEAR);
  const im=add(scene.add.image(STREET_AT.x+p.x,STREET_AT.y+p.y,key).setOrigin(pf.ox,pf.oy).setScale(1/pf.S).setDepth(3+p.y/1000).setTint(0xc6c4dc));
  const sh=add(scene.add.image(STREET_AT.x+p.x,STREET_AT.y+p.y,'g-shadow').setDisplaySize(30,8).setAlpha(.5).setDepth(2.9));
  return {im,ph:i*1.3,y:STREET_AT.y+p.y};});
 const sTrees=STREET_TREES.map((t,i)=>{const p=siso(t.X,t.Y);return makeTree(scene,{x:STREET_AT.x+p.x,y:STREET_AT.y+p.y,depth:4,seed:50+i,light:[.6,-.8],trunk:{h:t.h,lean:i?-.06:.06,limbs:[[.6,-50,-30,9],[.7,45,-36,8]]},
  clumps:[[-50,-t.h*.95,55,'lit'],[30,-t.h*1.05,60,'lit'],[0,-t.h*.75,58,'cool'],[-60,-t.h*.68,46,'cool'],[60,-t.h*.7,48,'cool']]});});
 objs.push(...sTrees);

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
  if(mode==='street')return fit({x:STREET_AT.x+330,y:STREET_AT.y+210,w:760,h:640},screen,{x:0,y:0,w,h},{x:STREET_AT.x,y:STREET_AT.y,w:STREET.w,h:STREET.h});
  if(mode==='door')box={x:560,y:520,w:270,h:400};
  else if(talking)box=portrait?{x:440,y:560,w:330,h:380}:{x:420,y:470,w:420,h:480};
  else box=portrait?{x:400,y:420,w:440,h:560}:{x:330,y:330,w:620,h:640};
  let v=fit(box,screen,safe,B);
  if(advance<1){const far=fit({x:260,y:760,w:660,h:500},screen,safe,B),e=smooth(advance);v={x:far.x+(v.x-far.x)*e,y:far.y+(v.y-far.y)*e,z:far.z*Math.pow(v.z/far.z,e)};}
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
  lights:[...LAMPS,...WINDOWS.map(([x,y,k])=>({x,y,kind:k||'window'}))],puddles,
  streetLights:street.lights.map(l=>({...l,x:STREET_AT.x+l.x/1,y:STREET_AT.y+l.y})),
  view,aim,cam,leafPoint,lightAt,guard,
  // st: {door, guard:{...}, wind}
  update(dt,st){
   t+=dt;const wind=1+.35*Math.sin(t*.37)+.2*Math.sin(t*1.13);
   drawDoor(st.door||0);
   const r=scene.children.getByName?.('reflect-door');if(r)r.setAlpha(.4*clamp((st.door||0)/1.2));
   if(st.guard){const L=lightAt(st.guard.x,st.guard.y);guard.update(dt,{...st.guard,light:L,wind});}else guard.hide();
   for(const f of flora)f.update(dt,wind);leaves.update(dt,wind);
   for(const s of sTrees)s.update(dt,wind*.8);
   for(const f of folk)f.im.y=f.y-Math.abs(Math.sin(t*1.6+f.ph))*1.2;
  },
  destroy(){for(const o of objs)o.destroy();}
 };
}
