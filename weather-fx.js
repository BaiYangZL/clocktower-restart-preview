// Live effects on top of the baked night scene. Everything here is cheap and bounded:
// a handful of additive halos (soft, linear-filtered, so they read as light, not pixels),
// and for rain two tiled streak layers kept at screen scale, a pool of ripples that open in
// the baked puddles, splashes on the paving and drips from the gate's eaves. The low tier
// keeps the same weather with fewer pieces.
import {GATE} from './town-gate.js';
const iso=(X,Y,Z=0)=>({x:(X-Y)*16,y:(X+Y)*8-Z});
function tex(scene,key,w,h,draw,linear=true){if(scene.textures.exists(key))return;const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=scene.textures.addCanvas(key,c);t.setFilter(linear?Phaser.Textures.FilterMode.LINEAR:Phaser.Textures.FilterMode.NEAREST);}

export function createFX(scene,{weather,lights,puddles,quality}){
 const low=quality==='low',rain=weather==='rain',objs=[];
 tex(scene,'fx-glow',64,64,(g,w)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(.25,'rgba(255,255,255,.45)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);});
 // halos: lamps and lanterns breathe a little; windows are quieter; the court glows through the arch
 const halos=[];
 const near=lights.filter(l=>l.kind!=='window'||Math.abs(l.X)<9&&l.Y>-8).slice(0,low?40:90);
 for(const l of near){const p=iso(l.X,l.Y,l.Z),k=l.kind;
  const size=k==='lamp'?44:k==='lantern'?34:k==='court'?60:k==='clock'?30:14,alpha=k==='lamp'?.34:k==='lantern'?.3:k==='court'?.22:k==='clock'?.18:.2;
  const im=scene.add.image(p.x,p.y,'fx-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(k==='clock'?0xfff0d0:0xffc06a).setAlpha(alpha).setDisplaySize(size*2,size*1.7).setDepth(20);
  halos.push({im,alpha,phase:Math.random()*9,flicker:k==='lamp'||k==='lantern'});objs.push(im);}
 // fireflies drifting at the edge of the woods on a clear night
 const flies=[];
 if(!rain){const homes=[[-8.5,3.2],[8.8,3.6],[-7,13.5],[-12.5,7],[13,9]];for(let i=0;i<(low?6:14);i++){const h=homes[i%homes.length],im=scene.add.image(0,0,'fx-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xd8ff9a).setDisplaySize(5,5).setDepth(21);
  flies.push({im,X:h[0]+(Math.random()-.5)*4,Y:h[1]+(Math.random()-.5)*3,Z:8+Math.random()*20,ph:Math.random()*20,sp:.3+Math.random()*.4});objs.push(im);}}
 // rain
 let layers=[],ripples=[],splashes=[],drips=[];
 if(rain){
  const streaks=(key,w,h,n,len,alpha)=>tex(scene,key,w,h,(g)=>{let s=key.length*977;const r=()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
   for(let i=0;i<n;i++){const x=r()*w,y=r()*h,l=len*(.6+r()*.8);g.strokeStyle=`rgba(200,214,240,${alpha*(.5+r()*.5)})`;g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x-l*.08,y+l);g.stroke();
    if(y+l>h){g.beginPath();g.moveTo(x,y-h);g.lineTo(x-l*.08,y-h+l);g.stroke();}}});
  streaks('fx-rain-far',180,240,low?26:40,10,.32);streaks('fx-rain-near',220,300,low?10:18,22,.5);
  for(const [key,speed,alpha] of (low?[['fx-rain-near',900,.55]]:[['fx-rain-far',520,.5],['fx-rain-near',980,.6]])){
   const t=scene.add.tileSprite(0,0,16,16,key).setOrigin(0,0).setDepth(40).setAlpha(alpha);layers.push({t,speed,alpha,off:0});objs.push(t);}
  tex(scene,'fx-ripple',28,12,(g)=>{g.strokeStyle='rgba(205,220,245,.9)';g.lineWidth=1.2;g.beginPath();g.ellipse(14,6,12,4.6,0,0,7);g.stroke();});
  tex(scene,'fx-splash',8,6,(g)=>{g.fillStyle='rgba(215,228,250,.9)';for(const [x,y] of [[1,4],[3,1],[4,0],[5,1],[7,4]])g.fillRect(x,y,1,1);},false);
  tex(scene,'fx-drop',2,6,(g)=>{g.fillStyle='rgba(215,228,250,.85)';g.fillRect(0,0,2,6);},false);
  for(let i=0;i<(low?10:24);i++){const im=scene.add.image(0,0,'fx-ripple').setDepth(6).setAlpha(0);ripples.push({im,t:Math.random(),life:.7+Math.random()*.3});objs.push(im);}
  for(let i=0;i<(low?6:16);i++){const im=scene.add.image(0,0,'fx-splash').setDepth(6).setAlpha(0);splashes.push({im,t:Math.random()*.3});objs.push(im);}
  // eaves: the arch keystone, both lanterns, the bartizan bases, the bridge-lamp hood
  const G=GATE,eaves=[[-.55,G.front+.04,70,G.floor],[.5,G.front+.04,71,G.floor],[-1.62,G.front+.12,37,G.floor],[1.62,G.front+.12,37,G.floor],[-3.0,G.front-.02,86,0],[3.0,G.front-.02,86,0]];
  // rain seen through the far arch of the passage, for when the camera is under the vault
  {const a=G.half,p0=iso(-a,G.passageBack,G.spring+a*16),p1=iso(a,G.passageBack,G.floor);var arch=scene.add.tileSprite(p0.x,p0.y,p1.x-p0.x,p1.y-p0.y,'fx-rain-far').setOrigin(0,0).setDepth(8).setAlpha(0);objs.push(arch);}
  for(const [X,Y,Z0,Z1] of eaves){const im=scene.add.image(0,0,'fx-drop').setDepth(7).setAlpha(0),sp=scene.add.image(0,0,'fx-splash').setDepth(7).setAlpha(0);drips.push({X,Y,Z0,Z1,im,sp,t:Math.random()*1.2,period:.9+Math.random()*.9});objs.push(im,sp);}
 }
 let roofed=0,clock=0;
 return {
  update(dt,cam){
   clock+=dt;
   for(const h of halos)if(h.flicker)h.im.setAlpha(h.alpha*(1+.06*Math.sin(clock*7+h.phase)+.03*Math.sin(clock*17.3+h.phase*2)));
   for(const f of flies){f.ph+=dt*f.sp;const p=iso(f.X+Math.sin(f.ph)*1.4,f.Y+Math.cos(f.ph*.7)*1.1,f.Z+Math.sin(f.ph*1.9)*6);f.im.setPosition(p.x,p.y).setAlpha(.35+.35*Math.max(0,Math.sin(f.ph*3.1)));}
   if(!rain)return;
   const v=cam.worldView,z=cam.zoom;
   // rain is screen-scale: the tile always covers the view and its pattern is not magnified
   for(const L of layers){L.off+=dt*L.speed;L.t.setPosition(v.x,v.y).setSize(v.width*z,v.height*z).setScale(1/z);L.t.tilePositionY=-L.off;L.t.tilePositionX=L.off*.08;L.t.setAlpha(L.alpha*(1-roofed));}
   if(typeof arch!=='undefined'){arch.tilePositionY-=dt*300;arch.setAlpha(.7*roofed);}
   const inView=(x,y)=>x>v.x&&x<v.x+v.width&&y>v.y&&y<v.y+v.height;
   for(const r of ripples){r.t+=dt;if(r.t>r.life){r.t=0;r.life=.6+Math.random()*.4;const p=puddles.length?puddles[(Math.random()*puddles.length)|0]:null;if(p&&inView(p.x,p.y))r.im.setPosition(p.x,p.y);else{r.im.setAlpha(0);continue;}}
    const k=r.t/r.life;r.im.setScale(.25+k*1.05).setAlpha(.5*(1-k)*(1-roofed));}
   for(const s of splashes){s.t+=dt;if(s.t>.28){s.t=0;const X=-1+Math.random()*2+(-.5+Math.random()),Y=2+Math.random()*12,p=iso(X+ (Y>1.6?.55*Math.sin((Y-1.6)*.33):0),Y);s.im.setPosition(Math.round(p.x),Math.round(p.y));}
    s.im.setAlpha((s.t<.18?.7:0)*(1-roofed));}
   for(const d of drips){d.t+=dt;const fall=.42;if(d.t>d.period)d.t=0;const top=iso(d.X,d.Y,d.Z0),bot=iso(d.X,d.Y,d.Z1);
    if(d.t<fall){const k=(d.t/fall)**2;d.im.setPosition(Math.round(top.x),Math.round(top.y+(bot.y-top.y)*k)).setAlpha(.8);d.sp.setAlpha(0);}
    else{d.im.setAlpha(0);d.sp.setPosition(Math.round(bot.x),Math.round(bot.y)).setAlpha(d.t<fall+.16?.75:0);}}
  },
  // inside the gate passage the rain is outside: fade it, keep it falling in the far arch
  setRoofed(k){roofed=k;},
  destroy(){for(const o of objs)o.destroy();}
 };
}
