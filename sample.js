import {Journey,renderSize,clamp,smooth,walkingTrace} from './journey.js';
import {createWorld,createAtlas,drawJourney,createDissolveNoise} from './map-art.js';
import {bakeTown,iso,roadCentre,GATE} from './town-gate.js';
import {createLighting} from './night-light.js';
import {createGateWorld} from './gate-runtime.js';
import {act} from './ram-youth.js';
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
const FPS=10,SPEED=1.15;
const STAND={X:0,Y:2.3},DOOR_SPOT={X:0,Y:.24},INSIDE={X:.05,Y:-.34},STEP_SPOT={X:.1,Y:1.05},ASIDE={X:1.62,Y:1.05};
class Story{
 constructor(){this.reset();}
 reset(){this.phase='idle';this.t=0;this.frame=0;this.acc=0;this.door=0;this.y={X:STAND.X,Y:STAND.Y,act:'idle',frame:0,side:1};this.hands=null;this.path=null;this.ended=false;this.started=false;}
 go(phase,actName,opts={}){this.phase=phase;this.t=0;this.frame=0;this.acc=0;this.y.act=actName;this.y.side=opts.side??1;this.path=opts.path||null;this.hands=null;}
 walk(phase,actName,to,side=1){const from={X:this.y.X,Y:this.y.Y},len=Math.hypot(to.X-from.X,to.Y-from.Y);this.go(phase,actName,{side,path:{from,to,dur:len/SPEED}});}
 tick(dt){
  this.t+=dt;this.acc+=dt;while(this.acc>=1/FPS){this.acc-=1/FPS;this.frame++;}
  const pose=act(this.y.act,this.frame);this.y.frame=this.frame;
  if(this.path){const k=clamp(this.t/this.path.dur);this.y.X=this.path.from.X+(this.path.to.X-this.path.from.X)*k;this.y.Y=this.path.from.Y+(this.path.to.Y-this.path.from.Y)*k;}
  const done=pose.end||(this.path&&this.t>=this.path.dur);
  switch(this.phase){
   case 'notice':if(done)this.go('idle','idle');break;
   case 'offer':if(done)this.go('hold','hold');break;               // letter held out, waiting
   case 'release':if(done)this.go('wait','wait');break;             // hand withdrawn, letter gone
   case 'deny':case 'puzzle':if(done)this.go('wait','wait');break;
   case 'bow':if(done)this.walk('toDoor','walkBack',DOOR_SPOT);break;
   case 'toDoor':if(done)this.go('reach','reachDoor');break;
   case 'reach':if(done){this.go('push','push');this.aimHands();}break;
   case 'push':{
    // he leans in and walks the leaves open; his palms stay on the wood until it passes them
    const k=clamp(this.t/3.2);this.door=1.52*smooth(k);
    this.y.X=DOOR_SPOT.X+(INSIDE.X-DOOR_SPOT.X)*smooth(k);this.y.Y=DOOR_SPOT.Y+(INSIDE.Y-DOOR_SPOT.Y)*smooth(Math.min(1,k*1.15));
    if(this.door<.9)this.aimHands();else if(this.hands){this.hands=null;this.y.act='standBack';this.frame=0;}
    if(k>=1)this.walk('fromDoor','walkFront',STEP_SPOT);break;}
   case 'fromDoor':if(done)this.walk('aside','walkSide',ASIDE,1);break;
   case 'aside':if(done)this.go('welcome','welcome');break;
   case 'welcome':if(done&&this.t>1.2)this.go('enter','welcome');break;
   case 'enter':if(this.t>3&&!this.ended){this.ended=true;$('ending').hidden=false;$('replay').hidden=false;}break;
  }
 }
 // palms flat on the two leaves, placed so both gloves show beside his shoulders
 aimHands(){const A=this.door,F=GATE.floor;this.hands={L:scene.world.leaf(-1,A,.3,F+15),R:scene.world.leaf(1,A,.86,F+22)};}
}
const story=new Story(),dialog=new Dialog();
const night=()=>weather==='rain'?'雨夜':'夜风';
let run=0;
const invitation=new Invitation({
 onSubmit:code=>{story.go('pending','wait');dialog.portrait.set('pending');return verify(code);},
 onResult:r=>answer(r,run)
});
$('letter-reopen').addEventListener('click',()=>{story.go('wait','wait');dialog.portrait.set('wait');invitation.reopen();});
async function meet(id){
 const alive=()=>id===run;
 story.go('reveal','idle');$('arrival').hidden=false;document.body.classList.add('at-gate');document.title='鸦木布拉夫 · 城门前';
 await sleep(1.6);if(!alive())return;
 story.go('notice','notice');await sleep(1.5);if(!alive())return;
 await dialog.say('夜深了，旅人。钟楼一直在等你。','greet');if(!alive())return;
 await dialog.say('鸦木布拉夫的城门，只为持信而来的人打开。','hold');if(!alive())return;
 story.go('offer','offer');
 await dialog.ask('这封信，是给你的。','offer',[['take','接过邀请函']]);if(!alive())return;
 // the hand-over: at this moment the letter leaves his glove and comes into your view
 story.go('release','release');dialog.portrait.set('wait');await dialog.hide();if(!alive())return;
 await invitation.receive();
}
async function answer(r,id){
 const alive=()=>id===run;
 if(r.kind==='ok'){
  await invitation.close(false);if(!alive())return;story.go('accepted','bow');
  await dialog.say('密语无误。欢迎你，旅人。','agree');if(!alive())return;
  await dialog.say('请随我来——这扇门，由我为你推开。','agree');if(!alive())return;
  await dialog.hide();story.go('bow','bow');return;
 }
 await invitation.close(true);if(!alive())return;
 if(r.kind==='denied'){
  story.go('deny','deny');
  const c=await dialog.ask('这不是钟楼认得的密语。再看一眼你的信吧。','refuse',[['retry','再看一眼邀请函'],['wait','暂且在门外等候']]);if(!alive())return;
  await dialog.hide();if(c==='retry'){$('letter-reopen').hidden=true;invitation.reopen();}
 }else if(r.kind==='limited'){
  await dialog.ask(`别急——钟楼需要片刻安静。约${r.wait}秒后再试。`,'pending',[['ok','好']]);if(!alive())return;
  await dialog.hide();$('letter-reopen').hidden=true;invitation.reopen();
 }else{
  // the message did not get through: not a refusal, and he says so
  story.go('puzzle','puzzle');
  const c=await dialog.ask(`……城里没有回音。也许是${night()}耽搁了信使。`,'puzzle',[['again','再呈一次'],['letter','再看一眼邀请函']]);if(!alive())return;
  await dialog.hide();$('letter-reopen').hidden=true;await invitation.reopen();if(c==='again'&&alive())$('letter-form').requestSubmit();
 }
}

class Arrival extends Phaser.Scene {
 create(){
  scene=this;this.cameras.main.visible=false;this.ready=false;this.world=null;this.fx=null;
  resizePaper();paintPaper();
  this.mascot=new Mascot($('mascot'));
  // the first screenful of map is painted before the curtain lifts
  atlas.setDetail(mapZoom()*paperContext.baseScale*1.05);atlas.paintAllNow(mapView(0).view);drawPaper(0);
  this.scale.on('resize',()=>{resizePaper();this.fitCamera();if(state.phase==='map'||state.phase==='dissolve')drawPaper(0);});
  this.applyQuality();$('boot').hidden=true;clearTimeout(window.bootTimer);
  this.startBake();this.beginAssets();
 }
 startBake(){
  this.bakeBusy=0;this.bakeWeather=weather;
  this.job=(function*(){const b=yield* bakeTown(1);const L=createLighting(b.lights,weather);b.puddles=yield* L.pass(b.buf);b.lighting=L;return b;})();
 }
 async beginAssets(){
  if(this.loading)return;this.loading=true;state.error=false;notice();
  try{
   if(!this.portraits){const [refuse,hold,offer]=await Promise.all(['refuse','hold','offer'].map(k=>loadImage(`assets/ram-${k}.webp`)));this.portraits=true;await dialog.portrait.load({refuse,hold,offer});}
  }catch(error){console.warn(error);this.loading=false;state.error=true;notice('沿途画面未能载入，检查网络后可继续旅程。',true);return;}
  this.loading=false;this.checkReady();
 }
 stepBake(budget){
  if(!this.job)return;const start=performance.now();let r;
  try{do r=this.job.next();while(!r.done&&performance.now()-start<budget);}
  catch(error){console.error(error);this.job=null;state.error=true;notice('沿途画面未能生成，请重试。',true);return;}
  this.bakeBusy+=performance.now()-start;
  if(r.done){this.job=null;this.install(r.value);}
 }
 install(baked){
  if(this.townImg){this.townImg.destroy();this.patchImg.destroy();this.textures.remove('town');this.textures.remove('gatePatch');this.fx?.destroy();}
  this.baked=baked;this.world=createGateWorld(baked);
  this.textures.addCanvas('town',this.world.staticCanvas).setFilter(Phaser.Textures.FilterMode.NEAREST);
  this.patchTex=this.textures.addCanvas('gatePatch',this.world.patch);this.patchTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  this.townImg=this.add.image(this.world.x0,this.world.y0,'town').setOrigin(0,0).setDepth(0);
  this.patchImg=this.add.image(this.world.patchX,this.world.patchY,'gatePatch').setOrigin(0,0).setDepth(1);
  this.makeFX();this.renderPatch();this.fitCamera();this.checkReady();
 }
 makeFX(){this.fx?.destroy();this.fx=createFX(this,{weather:this.bakeWeather,lights:this.baked.lights,puddles:this.baked.puddles||[],quality});}
 checkReady(){if(this.world&&this.portraits&&!this.loading&&!this.job){this.ready=true;state.ready=true;if(!state.error)notice();}}
 renderPatch(){if(this.world.render({door:+story.door.toFixed(3),youth:{...story.y},hands:story.hands}))this.patchTex.refresh();}
 // One art pixel = a whole number of canvas pixels, chosen so the gatehouse and the youth fit.
 baseZoom(){const {width:w,height:h}=this.scale;return Math.max(1,Math.floor(Math.min(w/280,h/330)));}
 fitCamera(){if(!this.world)return;this.cameras.main.setZoom(this.baseZoom());this.placeCamera();}
 cameraCentre(){
  const G=iso(0,1.4,58);
  // through the gate: the view centres on the arch's opening and closes in on it, so the far
  // court fills the screen; this is where the scene ends
  if(story.phase==='enter'){const k=smooth(clamp(story.t/2.8)),In=iso(0,GATE.front-.2,GATE.floor+30);return {x:G.x+(In.x-G.x)*k,y:G.y+(In.y-G.y)*k,zoom:1+2.2*k*k};}
  const p=state.advance,Y=15+(1.4-15)*p,X=roadCentre(Y)*(1-p),c=iso(X,Y,58*p);return {x:c.x,y:c.y,zoom:1};
 }
 placeCamera(){
  const cam=this.cameras.main,c=this.cameraCentre(),z=this.baseZoom()*c.zoom;cam.setZoom(z);
  // snap to whole canvas pixels so the art never shimmers while the camera moves
  cam.centerOn(Math.round(c.x*z)/z,Math.round(c.y*z)/z);
 }
 toScreen(x,y){const cam=this.cameras.main,k=innerWidth/this.scale.width;return {x:((x-cam.worldView.x)*cam.zoom)*k,y:((y-cam.worldView.y)*cam.zoom)*k};}
 applyQuality(){this.game.loop.setFPSLimit(quality==='high'?120:60);if(this.world)this.makeFX();}
 restart(){
  run++;timers.length=0;
  state.reset();mapSeed=(Date.now()%99991)+1;W=createWorld(mapSeed);atlas=createAtlas(W);mapCam.init=false;
  atlas.setDetail(mapZoom()*paperContext.baseScale*1.05);atlas.paintAllNow(mapView(0).view);
  story.reset();invitation.reset();dialog.reset();$('ending').hidden=true;$('companion').classList.remove('gone');
  // a new entry may bring a different night; the gate is baked again while he walks
  const next=rollWeather();if(next!==this.bakeWeather){weather=next;this.ready=false;this.startBake();}
  state.ready=this.ready;state.error=false;paperLayer.hidden=false;this.cameras.main.visible=false;this.applyQuality();
  $('arrival').hidden=true;$('replay').hidden=true;document.body.classList.remove('at-gate');document.title='一段远行';notice();
 }
 update(time,delta){
  this.stepBake(state.phase==='map'?6:12);
  if(paused||document.hidden)return;
  if(review.at!=null&&state.ready){while(state.time<review.at&&state.phase!=='arrived')state.tick(1/60);review.at=null;review.hold=state.phase!=='arrived';}
  const dt=review.hold?0:Math.min(delta/1000,.1);
  state.tick(dt);tickTimers(dt);this.cameras.main.visible=state.phase!=='map';
  // the companion: walking while things load, lantern raised when ready, resting on failure
  if(state.phase==='map'){this.mascot.set(state.error?'rest':state.ready?'arrive':'walk');this.mascot.tick(dt);}
  else if(state.phase==='dissolve'){$('companion').classList.add('gone');this.mascot.tick(dt);}
  if(state.phase==='arrived'&&story.phase==='idle'&&!story.ended&&!story.started){story.started=true;meet(run);}
  if(state.phase!=='map')story.tick(dt);
  if(this.world&&state.phase!=='map'){this.placeCamera();this.renderPatch();
   this.fx?.setRoofed(story.phase==='enter'?smooth(clamp((story.t-.9)/1.3)):0);this.fx?.update(dt,this.cameras.main);}
  if(state.phase==='map'||state.phase==='dissolve'){
   paperLayer.hidden=false;drawPaper(dt);
   if(state.phase==='map'&&!state.ready&&!state.error&&state.time>10)notice('画面仍在途中，旅程会继续。');
  }else{paperLayer.hidden=true;if(!state.error&&!$('notice').hidden&&$('retry').hidden)notice();}
 }
}
try{
 if(!window.Phaser)throw Error('缺少绘制库');
 const v=viewport();
 game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:v.width,height:v.height,backgroundColor:'#11141f',pixelArt:true,roundPixels:true,antialias:false,render:{mipmapFilter:'NEAREST',mipmapRegeneration:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},fps:{target:120,limit:quality==='high'?120:60},scene:Arrival});
}catch(error){window.bootFailure();console.error(error)}
$('quality').value=quality;
$('retry').onclick=()=>{state.error=false;if(!scene?.world&&!scene?.job)scene?.startBake();scene?.beginAssets();};
$('replay').onclick=()=>scene?.restart();
// Phaser's FIT keeps the previous aspect after a game-size change, so refit explicitly.
const refit=()=>{const v=viewport();if(!game)return;game.scale.resize(v.width,v.height);game.scale.displaySize.setAspectRatio(v.width/v.height);game.scale.refresh();};
$('quality').onchange=e=>{quality=e.target.value;e.target.blur();refit();scene?.applyQuality();};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'继续':'暂停';$('pause').setAttribute('aria-pressed',String(paused));if(paused)game?.loop.sleep();else if(!document.hidden)game?.loop.wake();};
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(refit,150)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)game?.loop.sleep();else if(!paused)game?.loop.wake();});
window.__arrival={state,story,dialog,invitation,get scene(){return scene},get weather(){return weather},get atlas(){return atlas},
 // review aid: advance the gate by s seconds of game time immediately
 ff:s=>{for(let i=0;i<s*30;i++){story.tick(1/30);tickTimers(1/30);scene.fx?.update(1/30,scene.cameras.main);}scene.placeCamera();scene.renderPatch();return story.phase;},
 frame:()=>new Promise(resolve=>game.renderer.snapshot(img=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);if(!paperLayer.hidden)g.drawImage(paperLayer,0,0,c.width,c.height);resolve(c);}))};
