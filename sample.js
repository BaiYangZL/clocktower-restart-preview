import {Journey,renderSize,clamp,smooth,walkingTrace} from './journey.js';
import {createWorld,createAtlas,drawJourney,createDissolveNoise} from './map-art.js';
import {createGate,SPOTS,MAX_DOOR} from './painted-gate.js';
import {paintStreet} from './street-scene.js';
import {Invitation,paintPaper} from './invite.js';
import {verify} from './preview-api.js';
import {Dialog} from './dialog.js';
import {Mascot} from './mascot.js';
import {createFX} from './weather-fx.js';
const $=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
// Review aids only: ?at=秒 jumps the journey to that moment and holds it; ?seed= fixes the
// map; ?weather=clear|rain forces the night's weather; ?slow=毫秒 delays downloads;
// ?fail=1 fails the first download; ?q=low|high picks the tier.
const review={at:query.has('at')?Number(query.get('at')):null,slow:Number(query.get('slow'))||0,fail:query.get('fail')==='1'};
const forced=['clear','rain'].includes(query.get('weather'))?query.get('weather'):null;
// The night is decided once per entry: 60% clear, 40% rain. Quality changes, dialogue and
// the walk through the gate never re-roll it.
const rollWeather=()=>forced||(Math.random()<.4?'rain':'clear');
let weather=rollWeather();
const olderMobile=matchMedia('(pointer:coarse)').matches&&((navigator.deviceMemory||4)<=4||(navigator.hardwareConcurrency||8)<=4);
let scene,game,quality=query.get('q')||(olderMobile?'low':'high'),paused=false;
const state=new Journey(),paperLayer=$('map-layer'),paperContext=paperLayer.getContext('2d');
const viewport=()=>renderSize(innerWidth,innerHeight,devicePixelRatio,quality);
function resizePaper(){const v=viewport();paperLayer.width=v.width;paperLayer.height=v.height;paperContext.baseScale=v.width/Math.max(1,innerWidth);}
function notice(message='',error=false){$('notice').hidden=!message;$('message').textContent=message;$('retry').hidden=!error;}
async function loadImage(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);let local;
 try{
  if(review.slow)await new Promise(r=>setTimeout(r,review.slow));
  if(review.fail){review.fail=false;throw Error('模拟失败');}
  const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);
  const blob=await response.blob();local=URL.createObjectURL(blob);const img=new Image();img.src=local;await img.decode();
  return img;
 }finally{clearTimeout(timer);if(local)URL.revokeObjectURL(local);}
}

// ---------- the endless map ----------
let mapSeed=Number(query.get('seed'))||(Date.now()%99991)+1,W=createWorld(mapSeed),atlas=createAtlas(W);
const mapCam={x:0,y:0,init:false},noise=createDissolveNoise(),mask=document.createElement('canvas');
const mapZoom=()=>clamp(Math.sqrt(innerWidth*innerHeight)/900,1,1.55);
function mapView(dt){
 // the walker sits a little left of centre so the country ahead is in view; the camera
 // follows his turns north and south with an easy lag
 const p=W.atDistance(state.travel),z=mapZoom(),vw=innerWidth/z,vh=innerHeight/z,tx=p.x+vw*.12;
 if(!mapCam.init){mapCam.x=tx;mapCam.y=p.y;mapCam.init=true;}
 mapCam.x=tx;mapCam.y+=(p.y-mapCam.y)*(1-Math.exp(-dt/.9));
 if(Math.abs(p.y-mapCam.y)>vh*.28)mapCam.y=p.y-Math.sign(p.y-mapCam.y)*vh*.28;
 const e=state.advance,lock=state.phase==='dissolve'?smooth(Math.min(1,state.phaseTime/1.4)):0,zoom=z*(1+.55*e*e);
 const cx=mapCam.x+(p.x-mapCam.x)*lock,cy=mapCam.y+(p.y-mapCam.y)*lock;
 return {zoom,cx,cy,view:{x0:cx-innerWidth/2/zoom,x1:cx+innerWidth/2/zoom,y0:cy-innerHeight/2/zoom,y1:cy+innerHeight/2/zoom}};
}
function drawPaper(dt){
 const m=mapView(dt);atlas.setDetail(mapZoom()*paperContext.baseScale*1.05);atlas.step(m.view,state.phase==='map'?5:3);
 drawJourney(paperContext,atlas,walkingTrace(W,state.travel),innerWidth,innerHeight,{...m,dissolve:state.dissolve,mask,noise,focus:{x:innerWidth/2,y:innerHeight/2}});
}

// ---------- game-time helpers (they stop while paused or in the background) ----------
const timers=[];const sleep=s=>new Promise(r=>timers.push({t:s,r}));
function tickTimers(dt){for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const r=timers[i].r;timers.splice(i,1);r();}}}

// ---------- the gate story ----------
// The guard in scene px. Poses are the character art (allow / offer / refuse, with or without
// the letter in hand) and the painted back view; walking lifts the boots in turn.
const SPEED=58,STRIDE=21;
class Story{
 constructor(){this.reset();}
 reset(){this.phase='idle';this.t=0;this.door=0;this.letter=true;this.g={x:SPOTS.stand.x,y:SPOTS.stand.y,pose:'allow',flip:false,walk:null,bow:0,arms:null};this.path=null;this.ended=false;this.started=false;this.travelled=0;}
 go(phase,pose,opts={}){this.phase=phase;this.t=0;if(pose)this.g.pose=pose;this.path=opts.path||null;this.g.walk=null;this.g.arms=null;if(opts.flip!=null)this.g.flip=opts.flip;}
 walk(phase,pose,to,flip=false){const from={x:this.g.x,y:this.g.y},len=Math.hypot(to.x-from.x,to.y-from.y);this.go(phase,pose,{flip,path:{from,to,dur:len/SPEED}});this.travelled=0;}
 get hand(){return this.letter?'allow':'allow-empty';}
 tick(dt){
  this.t+=dt;const g=this.g;
  if(this.path){const k=clamp(this.t/this.path.dur),e=k<.08?k*k/.16:k>.92?1-(1-k)*(1-k)/.16:k;   // ease into and out of the walk
   const px=g.x,py=g.y;g.x=this.path.from.x+(this.path.to.x-this.path.from.x)*e;g.y=this.path.from.y+(this.path.to.y-this.path.from.y)*e;
   this.travelled+=Math.hypot(g.x-px,g.y-py);g.walk=k<1?this.travelled/STRIDE*Math.PI:null;}
  const done=this.path&&this.t>=this.path.dur;
  switch(this.phase){
   case 'notice':g.bow=.25*Math.sin(clamp(this.t/1.1)*Math.PI);if(this.t>1.1)this.go('idle');break;   // a small bow of greeting
   case 'offer':if(this.t>.2)this.go('hold');break;
   case 'release':if(this.t>.3)this.go('wait','allow-empty');break;
   case 'deny':if(this.t>2.6)this.go('wait','allow-empty');break;            // the raised palm, held, then lowered
   case 'puzzle':g.bow=.12*Math.sin(clamp(this.t/1.4)*Math.PI);if(this.t>1.4)this.go('wait');break;
   case 'bow':g.bow=Math.sin(clamp(this.t/1.5)*Math.PI)*.8;if(this.t>1.5){g.bow=0;this.walk('toDoor','back',SPOTS.door);}break;
   case 'toDoor':if(done)this.go('reach','back');break;
   case 'reach':if(this.t>.7){this.go('push','back');this.aimHands(0,1);}else this.aimHands(0,smooth(this.t/.7));break;
   case 'push':{
    // he leans in and walks the leaves open; his palms stay on the wood until it passes them
    const k=clamp(this.t/3.4);this.door=MAX_DOOR*smooth(k);
    g.x=SPOTS.door.x+5*smooth(k);g.y=SPOTS.door.y-4*smooth(k);g.walk=k<.9?k*7*Math.PI:null;
    if(this.door<1.05)this.aimHands(this.door,1);else if(g.arms){g.arms=null;}
    if(k>=1)this.walk('fromDoor','allow-empty',SPOTS.near);break;}
   case 'fromDoor':if(done)this.walk('aside','allow-empty',SPOTS.aside);break;
   case 'aside':if(done)this.go('welcome','allow-empty');break;
   case 'welcome':if(this.t>1.4)this.go('enter');break;
   case 'enter':if(this.t>4.6&&!this.ended){this.ended=true;$('ending').hidden=false;$('replay').hidden=false;}break;
  }
 }
 // palms flat on the two leaves at shoulder height; k raises the arms from his sides
 aimHands(angle,k){const L=scene.gate.leafPoint('L',angle,.58,80),R=scene.gate.leafPoint('R',angle,.62,83),g=this.g,sy=g.y-86;
  const lerp=(p,s)=>({x:g.x+s*17+(p.x-g.x-s*17)*k,y:sy+30+(p.y-sy-30)*k});this.g.arms={L:lerp(L,-1),R:lerp(R,1)};}
}
const story=new Story(),dialog=new Dialog();
// what the chibi in the scene is doing, from the story's phase and pose
function guardState(){const p=story.phase,g=story.g;
 const act=g.pose==='back'?'back':p==='offer'||p==='hold'?'offer':p==='deny'?'refuse':p==='welcome'||p==='enter'?'welcome':story.letter?'hold':'idle';
 return {...g,act,letter:story.letter,tilt:p==='puzzle'||p==='pending'?9:0};}
const night=()=>weather==='rain'?'雨夜':'夜风';
let run=0;
const invitation=new Invitation({
 onSubmit:code=>{story.go('pending','allow-empty');dialog.portrait.set('pending');return verify(code);},
 onResult:r=>answer(r,run)
});
$('letter-reopen').addEventListener('click',()=>{story.go('wait','allow-empty');dialog.portrait.set('wait');invitation.reopen();});
async function meet(id){
 const alive=()=>id===run;
 story.go('reveal','allow');$('arrival').hidden=false;document.body.classList.add('at-gate');document.title='鸦木布拉夫 · 城门前';
 await sleep(1.6);if(!alive())return;
 story.go('notice');await sleep(1.2);if(!alive())return;
 await dialog.say('夜深了，旅人。钟楼一直在等你。','greet');if(!alive())return;
 await dialog.say('鸦木布拉夫的城门，只为持信而来的人打开。','hold');if(!alive())return;
 story.go('offer','offer');
 await dialog.ask('这封信，是给你的。','offer',[['take','接过邀请函']]);if(!alive())return;
 // the hand-over: at this moment the letter leaves his glove and comes into your view
 story.letter=false;story.go('release','allow-empty');dialog.portrait.set('wait');await dialog.hide();if(!alive())return;
 await invitation.receive();
}
async function answer(r,id){
 const alive=()=>id===run;
 if(r.kind==='ok'){
  await invitation.close(false);if(!alive())return;story.go('accepted','allow-empty');
  await dialog.say('密语无误。欢迎你，旅人。','agree');if(!alive())return;
  await dialog.say('请随我来——这扇门，由我为你推开。','agree');if(!alive())return;
  await dialog.hide();story.go('bow');return;
 }
 await invitation.close(true);if(!alive())return;
 if(r.kind==='denied'){
  story.go('deny','refuse-empty');
  const c=await dialog.ask('这不是钟楼认得的密语。再看一眼你的信吧。','refuse',[['retry','再看一眼邀请函'],['wait','暂且在门外等候']]);if(!alive())return;
  await dialog.hide();if(c==='retry'){$('letter-reopen').hidden=true;invitation.reopen();}
 }else if(r.kind==='limited'){
  await dialog.ask(`别急——钟楼需要片刻安静。约${r.wait}秒后再试。`,'pending',[['ok','好']]);if(!alive())return;
  await dialog.hide();$('letter-reopen').hidden=true;invitation.reopen();
 }else{
  // the message did not get through: not a refusal, and he says so
  story.go('puzzle','allow-empty');
  const c=await dialog.ask(`……城里没有回音。也许是${night()}耽搁了信使。`,'puzzle',[['again','再呈一次'],['letter','再看一眼邀请函']]);if(!alive())return;
  await dialog.hide();$('letter-reopen').hidden=true;await invitation.reopen();if(c==='again'&&alive())$('letter-form').requestSubmit();
 }
}

const ASSETS={plate:'gate-plate.webp',doorL:'door-left.webp',doorR:'door-right.webp',hole:'door-hole.png'};
const POSES=['allow','allow-empty','offer','refuse','refuse-empty'];
class Arrival extends Phaser.Scene {
 create(){
  scene=this;this.cameras.main.visible=false;this.ready=false;this.gate=null;this.fx=null;this.images=null;this.street=null;
  resizePaper();paintPaper();
  this.mascot=new Mascot($('mascot'));
  // the first screenful of map is painted before the curtain lifts
  atlas.setDetail(mapZoom()*paperContext.baseScale*1.05);atlas.paintAllNow(mapView(0).view);drawPaper(0);
  this.scale.on('resize',()=>{resizePaper();if(state.phase==='map'||state.phase==='dissolve')drawPaper(0);this.placeCamera(0,true);});
  this.applyQuality();$('boot').hidden=true;clearTimeout(window.bootTimer);
  this.beginAssets();
 }
 async beginAssets(){
  if(this.loading)return;this.loading=true;state.error=false;notice();
  try{
   if(!this.images){
    const entries=[...Object.entries(ASSETS).map(([k,f])=>[k,'assets/gate/'+f]),['guardAtlas','assets/guard/guard-atlas.webp'],...POSES.map(p=>['guard:'+p,'assets/gate/guard-'+p+'.webp'])];
    const [loaded,guardMeta]=await Promise.all([Promise.all(entries.map(([k,u])=>loadImage(u).then(img=>[k,img]))),
     fetch('assets/guard/guard-atlas.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();})]);
    const im={guard:{},guardMeta};for(const [k,img] of loaded){if(k.startsWith('guard:'))im.guard[k.slice(6)]=img;else im[k]=img;}
    await dialog.portrait.load(im.guard);this.images=im;
   }
  }catch(error){console.warn(error);this.loading=false;state.error=true;notice('沿途画面未能载入，检查网络后可继续旅程。',true);return;}
  this.loading=false;
  // the street is painted once per weather while the traveller is still on the map
  this.paintLater();
 }
 paintLater(){
  clearTimeout(this.paintTimer);
  this.paintTimer=setTimeout(()=>{try{const t0=performance.now();
   if(!this.street||this.street.weather!==weather){this.street={...paintStreet({weather,scale:quality==='low'?1:1.5}),weather};}
   this.install();this.buildMs=Math.round(performance.now()-t0);}
   catch(error){console.error(error);state.error=true;notice('沿途画面未能生成，请重试。',true);}},60);
 }
 install(){
  this.gate?.destroy();this.fx?.destroy();
  this.gate=createGate(this,{images:{...this.images,street:this.street},weather,quality});
  this.gateWeather=weather;this.makeFX();this.placeCamera(0,true);this.ready=true;state.ready=true;if(!state.error)notice();
 }
 makeFX(){
  this.fx?.destroy();if(!this.gate)return;
  this.fx=createFX(this,{weather:this.gateWeather,quality,lights:[...this.gate.lights,...this.gate.streetLights],puddles:this.gate.puddles,
   fliesAt:[[160,720],[1000,880],[300,620],[900,760],[1820,520],[2280,640]],
   splashArea:[{x:380,y:1110},{x:560,y:1110},{x:790,y:822},{x:612,y:822}],
   eaves:[[640,552,800],[722,580,822],[549,642,762],[458,592,728],[770,744,834],[395,1002,1118]]});
 }
 screen(){return {w:this.scale.width,h:this.scale.height};}
 placeCamera(dt,snap=false){
  if(!this.gate)return;const cam=this.cameras.main,s=this.screen();
  let mode='gate',enter=0;
  if(['toDoor','reach','push'].includes(story.phase))mode='door';
  if(story.phase==='enter'){enter=clamp(story.t/2.6);if(story.t>2.75)mode='street';}
  const talking=!$('dialog').hidden||!$('letter').hidden;
  let v=this.gate.view(mode,s,{talking,advance:state.advance,enter:mode==='street'?0:enter});
  if(mode==='street'){
   // emerging from the arch: a slightly closer view that settles back
   const k=smooth(clamp((story.t-2.75)/2.2));v={...v,z:v.z*(1.35-.35*k)};
   if(!this.inStreet){this.inStreet=true;snap=true;}
  }else this.inStreet=false;
  const c=this.gate.aim(v,dt,snap||enter>0||story.phase==='enter');
  cam.setZoom(c.z);cam.centerOn(c.x,c.y);
 }
 applyQuality(){this.game.loop.setFPSLimit(quality==='high'?120:60);if(this.gate)this.makeFX();}
 restart(){
  run++;timers.length=0;
  state.reset();mapSeed=(Date.now()%99991)+1;W=createWorld(mapSeed);atlas=createAtlas(W);mapCam.init=false;
  atlas.setDetail(mapZoom()*paperContext.baseScale*1.05);atlas.paintAllNow(mapView(0).view);
  story.reset();invitation.reset();dialog.reset();$('ending').hidden=true;$('companion').classList.remove('gone');$('veil').classList.remove('on');
  // a new entry may bring a different night; the street and the wet ground follow it
  const next=rollWeather();if(next!==this.gateWeather){weather=next;this.ready=false;this.paintLater();}
  state.ready=this.ready;state.error=false;paperLayer.hidden=false;this.cameras.main.visible=false;this.applyQuality();
  $('arrival').hidden=true;$('replay').hidden=true;document.body.classList.remove('at-gate');document.title='一段远行';notice();
 }
 update(time,delta){
  if(paused||document.hidden)return;
  if(review.at!=null&&state.ready){while(state.time<review.at&&state.phase!=='arrived')state.tick(1/60);review.at=null;review.hold=state.phase!=='arrived';}
  const dt=review.hold?0:Math.min(delta/1000,.1);
  state.tick(dt);tickTimers(dt);this.cameras.main.visible=state.phase!=='map';
  // the companion: walking while things load, lantern raised when ready, resting on failure
  if(state.phase==='map'){this.mascot.set(state.error?'rest':state.ready?'arrive':'walk');this.mascot.tick(dt);}
  else{$('companion').classList.add('gone');if(state.phase==='dissolve')this.mascot.tick(dt);}
  if(state.phase==='arrived'&&story.phase==='idle'&&!story.ended&&!story.started){story.started=true;meet(run);}
  if(state.phase!=='map')story.tick(dt);
  if(this.gate&&state.phase!=='map'){
   const inStreet=story.phase==='enter'&&story.t>2.75;
   this.gate.update(dt,{door:story.door,guard:guardState()});
   this.placeCamera(dt);
   // a short warm dark between the arch and the square
   $('veil').classList.toggle('on',story.phase==='enter'&&story.t>2.3&&story.t<2.9);
   this.fx?.setRoofed(story.phase==='enter'&&!inStreet?smooth(clamp((story.t-1)/1.2)):0);this.fx?.update(dt,this.cameras.main);
  }
  if(state.phase==='map'||state.phase==='dissolve'){
   paperLayer.hidden=false;drawPaper(dt);
   if(state.phase==='map'&&!state.ready&&!state.error&&state.time>10)notice('画面仍在途中，旅程会继续。');
  }else{paperLayer.hidden=true;if(!state.error&&!$('notice').hidden&&$('retry').hidden)notice();}
 }
}
try{
 if(!window.Phaser)throw Error('缺少绘制库');
 const v=viewport();
 game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:v.width,height:v.height,backgroundColor:'#11141f',pixelArt:false,antialias:true,roundPixels:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},fps:{target:120,limit:quality==='high'?120:60},scene:Arrival});
}catch(error){window.bootFailure();console.error(error)}
$('quality').value=quality;
$('retry').onclick=()=>{state.error=false;scene?.beginAssets();};
$('replay').onclick=()=>scene?.restart();
// Phaser's FIT keeps the previous aspect after a game-size change, so refit explicitly.
const refit=()=>{const v=viewport();if(!game)return;game.scale.resize(v.width,v.height);game.scale.displaySize.setAspectRatio(v.width/v.height);game.scale.refresh();};
$('quality').onchange=e=>{quality=e.target.value;e.target.blur();refit();scene?.applyQuality();};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'继续':'暂停';$('pause').setAttribute('aria-pressed',String(paused));if(paused)game?.loop.sleep();else if(!document.hidden)game?.loop.wake();};
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(refit,150)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)game?.loop.sleep();else if(!paused)game?.loop.wake();});
window.__arrival={state,story,dialog,invitation,get scene(){return scene},get weather(){return weather},get atlas(){return atlas},
 // review aid: advance the gate by s seconds of game time immediately
 ff:s=>{for(let i=0;i<s*30;i++){story.tick(1/30);tickTimers(1/30);scene.gate?.update(1/30,{door:story.door,guard:guardState()});scene.fx?.update(1/30,scene.cameras.main);scene.placeCamera(1/30);}return story.phase;},
 frame:()=>new Promise(resolve=>game.renderer.snapshot(img=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);if(!paperLayer.hidden)g.drawImage(paperLayer,0,0,c.width,c.height);resolve(c);}))};
