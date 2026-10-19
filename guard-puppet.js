// The guard as he moves in the scene: the user's chosen chibi art (deep hood, full white-and-
// gold ram mask, curled gold horns, black-and-gold coat, crimson-lined cape, white gloves,
// black letter) cut into layers by 工具脚本/制作Q版护卫分层.py — body, head, two legs, three
// hands (open palm / holding the letter / empty glove) and a back view made from the same
// silhouette. The sleeves between shoulder and cuff are drawn here, so each hand can go where
// the story needs it: hanging, holding out the letter, the raised palm, the welcome, and from
// behind, both palms on the doors. Same interface as chibi-guard.js (createChibi).
import {clamp} from './journey.js';

export const HEIGHT=164;
const UNIT=.125;                 // scene px per art px
const INK='#120c12';
// cuff position from the shoulder (art px), the hand's turn (rad) and size; L is on the
// viewer's left
const ARM={
 hangL:{dx:-40,dy:232,rot:-Math.PI,hand:'handFist',mirror:true,s:.9,hang:true},
 palmL:{dx:-88,dy:80,rot:-.1,hand:'handOpen',s:1.18},
 hangR:{dx:40,dy:232,rot:Math.PI,hand:'handFist',s:.9,hang:true},
 holdR:{dx:69,dy:200,rot:0,hand:'handLetter',s:1},
 fistR:{dx:62,dy:196,rot:.1,hand:'handFist',s:1},
 welcomeR:{dx:146,dy:172,rot:.9,hand:'handOpen',mirror:true,s:1.05},   // open palm towards the open doors
 offerR:{dx:112,dy:176,rot:.16,hand:'handLetter',s:1.34},   // held out low and towards the traveller
};
const ACTS={idle:['hangL','hangR'],hold:['hangL','holdR'],offer:['hangL','offerR'],refuse:['palmL','fistR'],welcome:['hangL','welcomeR'],back:['hangL','hangR']};
// direction from cuff to fingertips of the open hand as drawn (fingers up and to the left)
const OPEN_DIR=Math.atan2(-130,-68),OPEN_REACH=120;

function sleeveTexture(){
 // a tapered black sleeve, shoulder at the top, 256 art px long at .5 texture px per art px
 const w=60,h=128,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
 const path=()=>{g.beginPath();g.moveTo(w/2-19,0);g.quadraticCurveTo(w/2-22,h*.6,w/2-24,h);g.lineTo(w/2+24,h);g.quadraticCurveTo(w/2+22,h*.6,w/2+19,0);g.closePath();};
 const gr=g.createLinearGradient(w/2-24,0,w/2+24,0);gr.addColorStop(0,'#3e323c');gr.addColorStop(.3,'#241b22');gr.addColorStop(.75,'#150f14');gr.addColorStop(1,'#0c080b');
 path();g.fillStyle=gr;g.fill();
 g.save();path();g.clip();g.strokeStyle='rgba(90,72,84,.55)';g.lineWidth=1.4;
 for(const [x0,x1] of [[-8,-11],[4,7]]){g.beginPath();g.moveTo(w/2+x0,h*.12);g.quadraticCurveTo(w/2+(x0+x1)/2-2,h*.55,w/2+x1,h*.95);g.stroke();}
 g.restore();
 g.strokeStyle=INK;g.lineWidth=3.4;g.lineCap='round';
 g.beginPath();g.moveTo(w/2-19,0);g.quadraticCurveTo(w/2-22,h*.6,w/2-24,h);g.moveTo(w/2+19,0);g.quadraticCurveTo(w/2+22,h*.6,w/2+24,h);g.stroke();
 return c;
}

export function createChibi(scene,{depth=10,atlas,meta}={}){
 const F=meta.frames,P=meta.pivots,S=meta.scale,FEET=P.feet;
 const key='guard-atlas';
 if(scene.textures.exists(key))scene.textures.remove(key);
 const tex=scene.textures.addImage(key,atlas);tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
 for(const [n,f] of Object.entries(F))tex.add(n,0,...f.frame);
 if(scene.textures.exists('guard-sleeve'))scene.textures.remove('guard-sleeve');
 scene.textures.addCanvas('guard-sleeve',sleeveTexture()).setFilter(Phaser.Textures.FilterMode.LINEAR);
 const at=(p)=>({x:p[0]-FEET[0],y:p[1]-FEET[1]});
 // origin of a frame so that the art point `pv` is the image's position
 const originOf=(name,pv)=>{const f=F[name];return [(pv[0]-f.at[0])*S/f.frame[2],(pv[1]-f.at[1])*S/f.frame[3]];};
 const part=(name,pv)=>{pv=pv||F[name].at;const p=at(pv);return scene.add.image(p.x,p.y,key,name).setOrigin(...originOf(name,pv)).setScale(1/S);};
 const CUFF={handOpen:P.cuffL,handFist:P.cuffR,handLetter:P.cuffR};
 const parts={
  body:part('body'),bodyBack:part('bodyBack'),
  head:part('head',P.neck),headBack:part('headBack',P.neck),
  legL:part('legL',P.hipL),legR:part('legR',P.hipR),
  sleeveL:scene.add.image(0,0,'guard-sleeve').setOrigin(.5,.02),sleeveR:scene.add.image(0,0,'guard-sleeve').setOrigin(.5,.02),
  handL:scene.add.image(0,0,key,'handFist'),handR:scene.add.image(0,0,key,'handFist'),
 };
 const base={head:at(P.neck),legL:at(P.hipL),legR:at(P.hipR),body:{x:parts.body.x,y:parts.body.y},bodyBack:{x:parts.bodyBack.x,y:parts.bodyBack.y}};
 const SH={L:at(P.shoulderL),R:at(P.shoulderR)};
 const body=scene.add.container(0,0).setDepth(depth);
 const shadow=scene.add.image(0,0,'g-shadow').setDepth(depth-.5).setAlpha(.6);
 const cast=scene.add.image(0,0,'g-shadow').setDepth(depth-.6).setAlpha(.24);
 const ORDER_F=['legL','legR','body','head','sleeveL','handL','sleeveR','handR'];
 const ORDER_B=['sleeveL','handL','sleeveR','handR','legL','legR','bodyBack','headBack'];
 let order=null,t=0;
 const setOrder=o=>{if(order===o)return;order=o;body.removeAll(false);for(const k of Object.keys(parts))parts[k].setVisible(false);for(const k of o)body.add(parts[k].setVisible(true));};
 const cur={L:{...ARM.hangL},R:{...ARM.holdR}},kind={L:'',R:''};
 const col=(r,g,b)=>(Math.round(clamp(r)*255)<<16)|(Math.round(clamp(g)*255)<<8)|Math.round(clamp(b)*255);

 function arm(side,want,up,dt,st){
  const c=cur[side],e=1-Math.exp(-dt*8);
  for(const k of ['dx','dy','rot','s'])c[k]+=(want[k]-c[k])*e;
  let hand=want.hand;if(hand==='handLetter'&&!st.letter)hand='handFist';
  const mirror=!!want.mirror,im=parts['hand'+side],sl=parts['sleeve'+side];
  if(kind[side]!==hand+mirror){kind[side]=hand+mirror;im.setFrame(hand).setOrigin(...originOf(hand,CUFF[hand]));}
  // hanging arms swing against the stride
  const sw=st.walk==null||!want.hang?0:Math.sin(st.walk)*16*(side==='L'?1:-1);
  const sx=SH[side].x,sy=SH[side].y-up,cx=sx+c.dx+sw,cy=sy+c.dy;
  const vx=cx-sx,vy=cy-sy,len=Math.hypot(vx,vy);
  sl.setPosition(sx,sy).setRotation(Math.atan2(vy,vx)-Math.PI/2).setScale(1/S,(len+14)/256/S);
  im.setPosition(cx,cy).setRotation(c.rot).setScale((mirror?-1:1)*c.s/S,c.s/S);
 }

 return {
  // st: {x,y,act,letter,flip,walk(phase|null),bow,tilt,arms:{L,R}|null (scene points),light:{warm,side},wind,scale,alpha}
  update(dt,st){
   t+=dt;const back=st.act==='back',f=st.flip?-1:1,k=st.scale||1,u=UNIT*k;
   setOrder(back?ORDER_B:ORDER_F);
   const walk=st.walk,sw=walk==null?0:Math.sin(walk);
   // a lifted boot for each step; the body rises a little over it; at rest, a slow breath
   const up=walk==null?2.5*Math.sin(t*1.6):9*Math.abs(sw);
   parts.legL.setPosition(base.legL.x,base.legL.y-Math.max(0,sw)*22).setRotation(-sw*.1);
   parts.legR.setPosition(base.legR.x,base.legR.y-Math.max(0,-sw)*22).setRotation(-sw*.1);
   for(const n of ['body','bodyBack'])parts[n].setPosition(base[n].x,base[n].y-up);
   const bow=st.bow||0,tilt=clamp((st.tilt||0),-5,5)*Math.PI/180;
   for(const h of [parts.head,parts.headBack])h.setPosition(base.head.x,base.head.y-up*1.15+bow*34+.8*Math.sin(t*.9)).setRotation(tilt+bow*.07+(walk==null?0:sw*.015));
   const want=ACTS[st.act]||ACTS.idle;
   for(const [i,side] of [[0,'L'],[1,'R']]){
    let w=ARM[want[i]];
    if(back&&st.arms&&st.arms[side]){
     // a palm flat on a door leaf: the hand reaches the scene point, the sleeve follows
     const h=st.arms[side],lx=(h.x-st.x)/(u*f),ly=(h.y-st.y)/u,sx=SH[side].x,sy=SH[side].y-up;
     const a=Math.atan2(ly-sy,lx-sx),reach=Math.max(40,Math.hypot(lx-sx,ly-sy)-OPEN_REACH*.95);
     const mirror=side==='R',rot=mirror?a-(Math.PI-OPEN_DIR):a-OPEN_DIR;
     w={dx:Math.cos(a)*reach,dy:Math.sin(a)*reach,rot,hand:'handOpen',mirror,s:.95};
    }
    arm(side,w,up,dt,st);
   }
   body.setPosition(st.x,st.y).setScale(u*f,u).setAlpha(st.alpha??1).setVisible(true);
   // lamp-warm on the side facing the lamps, cool night elsewhere
   const L=st.light||{warm:.3,side:0},wm=L.warm,a0=.84;
   const mix=m=>col(a0*.93+(1.02-a0*.93)*m,a0*.95+(.93-a0*.95)*m,a0*1.07+(.8-a0*1.07)*m);
   const lt=mix(wm*clamp(.5-.5*L.side*f)),rt=mix(wm*clamp(.5+.5*L.side*f));
   for(const p of Object.values(parts))p.setTint(lt,rt,lt,rt);
   shadow.setPosition(st.x+1,st.y+1).setDisplaySize(62*k*(walk==null?1:.92),14*k).setAlpha(.62*(st.alpha??1)).setVisible(true);
   cast.setPosition(st.x-(L.side||0)*24,st.y+3).setDisplaySize(96*k,20*k).setRotation(-(L.side||0)*.25).setAlpha(.24*(st.alpha??1)).setVisible(true);
  },
  hide(){body.setVisible(false);shadow.setVisible(false);cast.setVisible(false);},
  destroy(){body.destroy(true);shadow.destroy();cast.destroy();}
 };
}
