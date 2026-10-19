// Live weather and light on top of the painted scene. Everything here is cheap and bounded:
// additive halos on lamps and windows (soft, so they read as light), fireflies on a clear
// night; for rain two tiled streak layers kept at screen scale, ripples in the puddles,
// splashes on the path and porch, and drips from the arch and the lamp hoods. The low tier
// keeps the same weather with fewer pieces. Positions are scene px.
function tex(scene,key,w,h,draw){if(scene.textures.exists(key))return;const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);scene.textures.addCanvas(key,c).setFilter(Phaser.Textures.FilterMode.LINEAR);}

export function createFX(scene,{weather,lights,puddles=[],quality,fliesAt=[],splashArea=null,eaves=[]}){
 const low=quality==='low',rain=weather==='rain',objs=[];
 tex(scene,'fx-glow',64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(.25,'rgba(255,255,255,.45)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);});
 const SIZE={lamp:58,lantern:44,window:20,clock:46,candle:16,bulb:9},ALPHA={lamp:.36,lantern:.32,window:.18,clock:.14,candle:.3,bulb:.38};
 const halos=[];
 for(const l of lights.slice(0,low?40:120)){const k=l.kind,s=SIZE[k]||16;
  const im=scene.add.image(l.x,l.y,'fx-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(k==='clock'?0xfff0d0:0xffc06a).setAlpha(ALPHA[k]||.2).setDisplaySize(s*2,s*1.8).setDepth(k==='bulb'||k==='candle'?6:20);
  halos.push({im,alpha:ALPHA[k]||.2,phase:Math.random()*9,flicker:k!=='window'&&k!=='clock'});objs.push(im);}
 const flies=[];
 if(!rain)for(let i=0;i<(low?6:14)&&fliesAt.length;i++){const h=fliesAt[i%fliesAt.length],im=scene.add.image(0,0,'fx-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xd8ff9a).setDisplaySize(6,6).setDepth(33);
  flies.push({im,x:h[0]+(Math.random()-.5)*80,y:h[1]+(Math.random()-.5)*50,ph:Math.random()*20,sp:.3+Math.random()*.4});objs.push(im);}
 let layers=[],ripples=[],splashes=[],drips=[];
 if(rain){
  const streaks=(key,w,h,n,len,alpha)=>tex(scene,key,w,h,(g)=>{let s=key.length*977;const r=()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
   for(let i=0;i<n;i++){const x=r()*w,y=r()*h,l=len*(.6+r()*.8);g.strokeStyle=`rgba(200,214,240,${alpha*(.5+r()*.5)})`;g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x-l*.08,y+l);g.stroke();
    if(y+l>h){g.beginPath();g.moveTo(x,y-h);g.lineTo(x-l*.08,y-h+l);g.stroke();}}});
  streaks('fx-rain-far',180,240,low?26:40,10,.32);streaks('fx-rain-near',220,300,low?10:18,22,.5);
  for(const [key,speed,alpha] of (low?[['fx-rain-near',900,.55]]:[['fx-rain-far',520,.5],['fx-rain-near',980,.6]])){
   const t=scene.add.tileSprite(0,0,16,16,key).setOrigin(0,0).setDepth(40).setAlpha(alpha);layers.push({t,speed,alpha,off:0});objs.push(t);}
  tex(scene,'fx-ripple',40,16,(g)=>{g.strokeStyle='rgba(205,220,245,.9)';g.lineWidth=1.4;g.beginPath();g.ellipse(20,8,17,6.4,0,0,7);g.stroke();});
  tex(scene,'fx-splash',12,8,(g)=>{g.fillStyle='rgba(215,228,250,.9)';for(const [x,y] of [[1,6],[4,2],[6,0],[8,2],[11,6]])g.fillRect(x,y,1.4,1.4);});
  tex(scene,'fx-drop',3,9,(g)=>{g.fillStyle='rgba(215,228,250,.85)';g.fillRect(0,0,3,9);});
  for(let i=0;i<(low?10:24);i++){const im=scene.add.image(0,0,'fx-ripple').setDepth(6).setAlpha(0);ripples.push({im,t:Math.random(),life:.7+Math.random()*.3});objs.push(im);}
  for(let i=0;i<(low?6:16);i++){const im=scene.add.image(0,0,'fx-splash').setDepth(6).setAlpha(0);splashes.push({im,t:Math.random()*.3});objs.push(im);}
  for(const [x,y0,y1] of eaves){const im=scene.add.image(0,0,'fx-drop').setDepth(7).setAlpha(0),sp=scene.add.image(0,0,'fx-splash').setDepth(7).setAlpha(0);drips.push({x,y0,y1,im,sp,t:Math.random()*1.2,period:.9+Math.random()*.9});objs.push(im,sp);}
 }
 let roofed=0,clock=0;
 return {
  update(dt,cam){
   clock+=dt;
   for(const h of halos)if(h.flicker)h.im.setAlpha(h.alpha*(1+.06*Math.sin(clock*7+h.phase)+.03*Math.sin(clock*17.3+h.phase*2)));
   for(const f of flies){f.ph+=dt*f.sp;f.im.setPosition(f.x+Math.sin(f.ph)*30,f.y+Math.cos(f.ph*.7)*18+Math.sin(f.ph*1.9)*8).setAlpha(.35+.35*Math.max(0,Math.sin(f.ph*3.1)));}
   if(!rain)return;
   const v=cam.worldView,z=cam.zoom;
   for(const L of layers){L.off+=dt*L.speed;L.t.setPosition(v.x,v.y).setSize(v.width*z,v.height*z).setScale(1/z);L.t.tilePositionY=-L.off;L.t.tilePositionX=L.off*.08;L.t.setAlpha(L.alpha*(1-roofed));}
   const inView=(x,y)=>x>v.x&&x<v.x+v.width&&y>v.y&&y<v.y+v.height;
   for(const r of ripples){r.t+=dt;if(r.t>r.life){r.t=0;r.life=.6+Math.random()*.4;const p=puddles.length?puddles[(Math.random()*puddles.length)|0]:null;if(p&&inView(p.x,p.y))r.im.setPosition(p.x+(Math.random()-.5)*40,p.y+(Math.random()-.5)*8);else{r.im.setAlpha(0);continue;}}
    const k=r.t/r.life;r.im.setScale(.25+k*1.05).setAlpha(.5*(1-k)*(1-roofed));}
   for(const s of splashes){s.t+=dt;if(s.t>.28){s.t=0;const a=splashArea;if(a){const u=Math.random(),w=Math.random();s.im.setPosition(a[0].x+(a[1].x-a[0].x)*u+(a[3].x-a[0].x)*w,a[0].y+(a[1].y-a[0].y)*u+(a[3].y-a[0].y)*w);}}
    s.im.setAlpha((s.t<.18?.7:0)*(1-roofed));}
   for(const d of drips){d.t+=dt;const fall=.42;if(d.t>d.period)d.t=0;
    if(d.t<fall){const k=(d.t/fall)**2;d.im.setPosition(d.x,d.y0+(d.y1-d.y0)*k).setAlpha(.8);d.sp.setAlpha(0);}
    else{d.im.setAlpha(0);d.sp.setPosition(d.x,d.y1).setAlpha(d.t<fall+.16?.75:0);}}
  },
  setRoofed(k){roofed=k;},
  destroy(){for(const o of objs)o.destroy();}
 };
}
