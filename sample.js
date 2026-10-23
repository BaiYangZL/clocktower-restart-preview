import {Journey,renderSize,clamp,smooth,walkingTrace} from './journey.js';
import {createWorld,createAtlas,drawJourney,createDissolveNoise} from './map-art.js';
import {createGate,SPOTS,MAX_DOOR} from './painted-gate.js';
import {paintApproach} from './approach-road.js';
import {Invitation,paintPaper} from './invite.js';
import {verify} from './preview-api.js';
import {Dialog} from './dialog.js';
import {Mascot} from './mascot.js';
import {createFX} from './weather-fx.js';
import {GateStory} from './gate-story.js';
import {createTavernTransition} from './tavern-transition.js';
const $=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
// Review aids only: ?at=秒 jumps the journey to that moment and holds it; ?seed= fixes the
// map; ?weather=clear|rain forces the night's weather; ?slow=毫秒 delays downloads;
// ?fail=1 fails the first download; ?q=low|high|ultra picks the tier.
const review={at:query.has('at')?Number(query.get('at')):null,slow:Number(query.get('slow'))||0,fail:query.get('fail')==='1'};
const forced=['clear','rain'].includes(query.get('weather'))?query.get('weather'):null;
// The night is decided once per entry: 90% rain, 10% clear (白羊 2026-10-21). Quality changes, dialogue and
// the walk through the gate never re-roll it.
const rollWeather=()=>forced||(Math.random()<.9?'rain':'clear');
let weather=rollWeather();
// iOS Safari and WeChat report no deviceMemory; an unknown value is not evidence of an old phone,
// so every phone starts on the fine tier and only what the device actually reports demotes it.
// A phone that cannot keep up is handled by the frame-rate governor below (lower resolution,
// same effects), so a phone shows the desktop's picture.
const known=(v,lim)=>typeof v==='number'&&v>0&&v<lim;
const olderMobile=matchMedia('(pointer:coarse)').matches&&(known(navigator.deviceMemory,3)||known(navigator.hardwareConcurrency,4));
const validQuality=q=>['low','high','ultra'].includes(q);
let savedQuality;try{savedQuality=localStorage.getItem('arrival-quality');}catch{/* Storage may be unavailable in private browsers. */}
let scene,game,quality=validQuality(query.get('q'))?query.get('q'):validQuality(savedQuality)?savedQuality:olderMobile?'low':'high',paused=false,inspectFrozen=false,inspectUpdate,resScale=1;
const state=new Journey(),paperLayer=$('map-layer'),paperContext=paperLayer.getContext('2d');
const viewport=()=>renderSize(innerWidth,innerHeight,devicePixelRatio,quality,resScale);
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
const tavernTransition=createTavernTransition({pauseGate:()=>game?.loop.sleep()});
window.__tavernEntry=tavernTransition;
const story=new GateStory({spots:SPOTS,maxDoor:MAX_DOOR,
 leafPoint:(...args)=>scene.gate.leafPoint(...args),
 onEnd:()=>tavernTransition.enter()
}),dialog=new Dialog();
const guardState=()=>story.guardState;
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
 story.go('offer','offer');await sleep(.8);if(!alive())return;
 await dialog.ask('这封信，是给你的。','offer',[['take','接过邀请函']]);if(!alive())return;
 // the hand-over: at this moment the letter leaves his glove and comes into your view
 story.letter=false;story.go('release','allow-empty');dialog.portrait.set('wait');await dialog.hide();if(!alive())return;
 await invitation.receive();
}
async function answer(r,id){
 const alive=()=>id===run;
 if(r.kind==='ok'){
  await invitation.close(false);if(!alive())return;story.accept();
  await dialog.say('密语无误。欢迎你，旅人。','agree');if(!alive())return;
  await dialog.say('请随我来——这扇门，由我为你推开。','agree');if(!alive())return;
  await dialog.hide();story.lead();return;
 }
 await invitation.close(true);if(!alive())return;
 if(r.kind==='denied'){
  story.go('deny','refuse-empty');
  const c=await dialog.ask('这不是钟楼认得的密语。再看一眼你的信吧。','refuse',[['retry','再看一眼邀请函'],['wait','暂且在门外等候']]);if(!alive())return;
  await dialog.hide();if(c==='retry'){$('letter-reopen').hidden=true;invitation.reopen();}
 }else if(r.kind==='limited'){
  story.go('pending');
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
const useHDEnvironment=()=>quality!=='low'&&query.get('environment')!=='original';
const environmentURL=(k,f,hd)=>hd&&k!=='hole'?'assets/gate-hd/'+f.replace('.webp','-2x.webp'):'assets/gate/'+f;
const POSES=['allow','allow-empty','offer','refuse','refuse-empty'];
class Arrival extends Phaser.Scene {
 create(){
  scene=this;this.cameras.main.visible=false;this.ready=false;this.gate=null;this.fx=null;this.images=null;
  // a faint vignette keeps the eye on the lit gate; one cheap pass, the night's colour is untouched (WebGL only)
  this.cameras.main.filters?.internal.addVignette(.5,.48,.95,.22,0x0a0614);
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
    const environmentHD=useHDEnvironment();
    const entries=[...Object.entries(ASSETS).map(([k,f])=>[k,environmentURL(k,f,environmentHD)]),['guardSheet','assets/pixel-guard/guard-v4.webp'],['guardRims','assets/pixel-guard/guard-v4-rim.webp'],...POSES.map(p=>['guard:'+p,'assets/gate/guard-'+p+'.webp'])];
    const [loaded,guardMeta]=await Promise.all([Promise.all(entries.map(([k,u])=>loadImage(u).then(img=>[k,img]))),
     fetch('assets/pixel-guard/guard-v4.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();})]);
    const im={guard:{},guardMeta,environmentHD};for(const [k,img] of loaded){if(k.startsWith('guard:'))im.guard[k.slice(6)]=img;else im[k]=img;}
    await dialog.portrait.load(im.guard);this.images=im;
   }
  }catch(error){console.warn(error);this.loading=false;state.error=true;notice('沿途画面未能载入，检查网络后可继续旅程。',true);return;}
  this.loading=false;
  // The door preview ends at the threshold; only the approach needs baking.
  if(this.images.environmentHD!==useHDEnvironment())this.changeEnvironment();else this.paintLater();
 }
 paintLater(){
  clearTimeout(this.paintTimer);
  this.paintTimer=setTimeout(()=>{try{const t0=performance.now();
   const road=weather+quality;if(!this.approach||this.approach.key!==road)this.approach={...paintApproach({weather,quality}),key:road};
   this.install();this.buildMs=Math.round(performance.now()-t0);}
   catch(error){console.error(error);state.error=true;notice('沿途画面未能生成，请重试。',true);}},60);
 }
 install(){
  this.gate?.destroy();this.fx?.destroy();
  this.gate=createGate(this,{images:{...this.images,approach:this.approach},weather,quality});
  this.gateWeather=weather;this.gateQuality=quality;this.makeFX();this.placeCamera(0,true);this.ready=true;state.ready=true;if(!state.error)notice();tavernTransition.prepare();
 }
 makeFX(){
  this.fx?.destroy();if(!this.gate)return;
  this.fx=createFX(this,{weather:this.gateWeather,quality,gate:this.gate.fx});
 }
 screen(){return {w:this.scale.width,h:this.scale.height};}
 placeCamera(dt,snap=false){
  if(!this.gate)return;const cam=this.cameras.main,s=this.screen();
  let mode='gate';
  if(['turn','toDoor','fromDoor','aside'].includes(story.phase))mode='approach';
  if(['faceDoor','reach','push','releaseDoor','settle','welcome'].includes(story.phase))mode='door';
  const talking=!$('dialog').hidden||!$('letter').hidden;
  const v=this.gate.view(mode,s,{talking,advance:state.advance});
  const c=this.gate.aim(v,dt,snap);
  cam.setZoom(c.z);cam.centerOn(c.x,c.y);
 }
 async changeEnvironment(){
  const version=this.environmentLoad=(this.environmentLoad||0)+1,hd=useHDEnvironment();
  if(!this.images)return;
  if(this.images.environmentHD===hd){if(this.gateQuality!==quality)this.paintLater();else if(this.gate)this.makeFX();return;}
  try{
   const entries=await Promise.all(Object.entries(ASSETS).filter(([k])=>k!=='hole').map(async([k,f])=>[k,await loadImage(environmentURL(k,f,hd))]));
   if(version!==this.environmentLoad)return;
   this.images={...this.images,...Object.fromEntries(entries),environmentHD:hd};this.paintLater();
  }catch(error){if(version!==this.environmentLoad)return;console.warn('环境清晰度切换未完成',error);notice('这档环境素材暂未载入，当前画面可继续；可重新切换画质重试。');}
 }
 applyQuality(){this.game.loop.setFPSLimit(60);if(this.images)this.changeEnvironment();}
 restart(){
  run++;timers.length=0;
  state.reset();mapSeed=(Date.now()%99991)+1;W=createWorld(mapSeed);atlas=createAtlas(W);mapCam.init=false;
  atlas.setDetail(mapZoom()*paperContext.baseScale*1.05);atlas.paintAllNow(mapView(0).view);
  story.reset();invitation.reset();dialog.reset();$('ending').hidden=true;$('companion').classList.remove('gone');$('veil').classList.remove('on');
  // A new entry may bring a different night; the approach and wet ground follow it.
  const next=rollWeather();if(next!==this.gateWeather){weather=next;this.ready=false;this.paintLater();}
  state.ready=this.ready;state.error=false;paperLayer.hidden=false;this.cameras.main.visible=false;this.applyQuality();
  $('arrival').hidden=true;$('replay').hidden=true;document.body.classList.remove('at-gate');document.title='一段远行';notice();
 }
 update(time,delta){
  if(paused||document.hidden)return;
  govern(delta);
  if(review.at!=null&&state.ready){while(state.time<review.at&&state.phase!=='arrived')state.tick(1/60);review.at=null;review.hold=state.phase!=='arrived';}
  const dt=review.hold?0:Math.min(delta/1000,.1);
  state.tick(dt);tickTimers(dt);this.cameras.main.visible=state.phase!=='map';
  // the companion: walking while things load, lantern raised when ready, resting on failure
  if(state.phase==='map'){this.mascot.set(state.error?'rest':state.ready?'arrive':'walk');this.mascot.tick(dt);}
  else{$('companion').classList.add('gone');if(state.phase==='dissolve')this.mascot.tick(dt);}
  if(state.phase==='arrived'&&story.phase==='idle'&&!story.ended&&!story.started){story.started=true;meet(run);}
  if(state.phase!=='map'&&!inspectFrozen)story.tick(dt);
  if(this.gate&&state.phase!=='map'){
   this.gate.update(dt,{door:story.door,guard:guardState()});
   this.placeCamera(dt);inspectUpdate?.();
   this.fx?.update(dt,this.cameras.main);
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
 game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:v.width,height:v.height,backgroundColor:'#11141f',pixelArt:false,antialias:true,roundPixels:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},fps:{target:60,limit:60},scene:Arrival});
}catch(error){window.bootFailure();console.error(error)}
$('quality').value=quality;
$('retry').onclick=()=>{state.error=false;scene?.beginAssets();};
$('replay').onclick=()=>scene?.restart();
// Phaser's FIT keeps the previous aspect after a game-size change, so refit explicitly.
const refit=()=>{const v=viewport();if(!game)return;game.scale.resize(v.width,v.height);game.scale.displaySize.setAspectRatio(v.width/v.height);game.scale.refresh();};
$('quality').onchange=e=>{quality=e.target.value;try{localStorage.setItem('arrival-quality',quality);}catch{}resScale=1;frames.length=0;calm=0;e.target.blur();refit();scene?.applyQuality();};
// Frame-rate governor: if the median frame over ~2 s stays above 19 ms (under ~52 fps), step the
// canvas resolution down by 12%, at most to 60%. Effects and weather are never cut. Long stalls
// (tab switches, baking, shader warm-up) are ignored; ?q= or a manual tier choice resets it.
const frames=[];let calm=0;
function govern(delta){
 // Ultra is an explicit image-quality choice: do not silently reduce its resolution.
 if(quality==='ultra'){frames.length=0;return;}
 if(delta>100||state.phase==='map'&&!state.ready){frames.length=0;return;}
 if((calm-=delta)>0)return;
 frames.push(delta);if(frames.length<120)return;
 const m=[...frames].sort((a,b)=>a-b)[60];frames.length=0;
 if(m>19&&resScale>.6){resScale=Math.max(.6,resScale*.88);calm=1500;refit();console.info('画面分辨率自动降至',resScale.toFixed(2),'中位帧',m.toFixed(1),'ms');}
}
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'继续':'暂停';$('pause').setAttribute('aria-pressed',String(paused));if(paused)game?.loop.sleep();else if(!document.hidden)game?.loop.wake();};
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(refit,150)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)game?.loop.sleep();else if(!paused)game?.loop.wake();});
window.__arrival={state,story,dialog,invitation,get scene(){return scene},get weather(){return weather},get atlas(){return atlas},
 // review aid: advance the gate by s seconds of game time immediately
 ff:s=>{for(let i=0;i<s*30;i++){story.tick(1/30);tickTimers(1/30);scene.gate?.update(1/30,{door:story.door,guard:guardState()});scene.fx?.update(1/30,scene.cameras.main);scene.placeCamera(1/30);}return story.phase;},
 frame:()=>new Promise(resolve=>game.renderer.snapshot(img=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);if(!paperLayer.hidden)g.drawImage(paperLayer,0,0,c.width,c.height);resolve(c);}))};
if(query.get('inspect')==='1')import('./guard-review.js').then(({installReview})=>{
 inspectUpdate=installReview({...window.__arrival,
  cancelDialogue:()=>{run++;timers.length=0;dialog.reset();invitation.reset();$('ending').hidden=true;},
  freeze:b=>{inspectFrozen=b;},
  draw:()=>{scene.gate.update(0,{door:story.door,guard:guardState()});scene.placeCamera(0,true);inspectUpdate?.();},
  frame:()=>scene?.gate?.guard.frame||'loading'
 });
});
