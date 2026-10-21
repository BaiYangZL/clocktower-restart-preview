// Night light and weather over the painted scene. The painting is lit evenly; this layer
// gives it a night: one low-resolution light map multiplied over everything in the world
// (castle, road, trees, the guard alike, so they share one light) — a cool ambient with
// warm pools where lamps, windows and the doorway reach — and on top of it the lamps
// themselves: a hot core, a halo, wide scattering in the damp air, a downward cone and a
// glossy pool on the ground. Rain: streaks lit inside each lamp's light, puddles holding
// the lamps' reflections, rings in puddles and on the wet stone, splashes, drips from eaves
// and from the trees, low drifting mist. Fireflies in the planting (a few, under the
// crowns, on a wet night). Everything is bounded; the low tier keeps the same weather with
// fewer pieces. Positions are scene px.
function tex(scene,key,w,h,draw){if(scene.textures.exists(key))return;const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);scene.textures.addCanvas(key,c).setFilter(Phaser.Textures.FilterMode.LINEAR);}
const rad=(g,x,y,r,stops)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);for(const [k,c] of stops)gr.addColorStop(k,c);return gr;};
const D={mist:33,map:34,ground:35,glow:36,flies:37,rain:40};

function paintLightMap(scene,{bounds,lamps,windows,rain,low,ultra,canopies=[]}){
 // Ultra doubles sampling precision without changing light placement, softness or brightness.
 const S=low?.18:ultra?.5:.25,c=document.createElement('canvas');c.width=Math.ceil(bounds.w*S);c.height=Math.ceil(bounds.h*S);
 const g=c.getContext('2d');g.setTransform(S,0,0,S,-bounds.x*S,-bounds.y*S);
 // Ambient: a violet-indigo night (never grey-blue), a little deeper with distance from the gate
 // so the eye travels up the road to the warm doorway.
 g.fillStyle=rain?'rgb(112,104,150)':'rgb(124,114,160)';g.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);
 {const gr=g.createRadialGradient(560,880,300,560,880,2300);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.28)');
  g.globalCompositeOperation='multiply';g.fillStyle=gr;g.globalAlpha=1;g.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);g.globalCompositeOperation='source-over';
  g.fillStyle='rgba(30,20,60,.18)';g.globalCompositeOperation='multiply';g.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);g.globalCompositeOperation='source-over';}
 g.globalCompositeOperation='lighter';
 const pool=(x,y,rx,ry,col,a)=>{g.save();g.translate(x,y);g.scale(1,ry/rx);g.fillStyle=rad(g,0,0,rx,[[0,`rgba(${col},${a})`],[.4,`rgba(${col},${a*.6})`],[1,`rgba(${col},0)`]]);g.fillRect(-rx,-rx,rx*2,rx*2);g.restore();};
 // the gate front: the lamps together warm the whole façade, steps and forecourt
 pool(610,760,640,460,'92,62,30',1);
 pool(680,800,240,150,'70,44,18',1);       // spill from the doorway onto the steps
 for(const l of lamps){
  pool(l.fx,l.fy,l.r*1.05,l.r*.58,'150,100,44',1);   // amber light on the ground under it
  pool(l.fx,l.fy,l.r*.42,l.r*.24,'110,70,26',1);     // the bright heart of that pool
  pool(l.x,l.y+l.r*.25,l.r*.7,l.r*.7,'140,96,46',.9); // the wall, trees and figures round it
  pool(l.x,(l.y+l.fy)/2+30,l.r*.85,l.r*.6,'120,80,36',.85); // all round the post, both sides
 }
 for(const [x,y] of windows)pool(x,y+8,60,44,'120,82,40',.75);
 for(const c of canopies)pool(c.x,c.y-c.r*.4,c.r*1.3,c.r*1.1,'34,40,40',.9);
 g.globalCompositeOperation='source-over';
 const key='fx-lightmap';if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addCanvas(key,c).setFilter(Phaser.Textures.FilterMode.LINEAR);
 return scene.add.image(bounds.x,bounds.y,key).setOrigin(0,0).setScale(1/S).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(D.map);
}

export function createFX(scene,{weather,quality,gate}){
 const low=quality==='low',rain=weather==='rain',objs=[],add=o=>(objs.push(o),o);
 const {lamps,windows,streetLights=[],puddles=[],bounds,canopies=[],eaves=[]}=gate;
 tex(scene,'fx-glow',64,64,(g)=>{g.fillStyle=rad(g,32,32,32,[[0,'rgba(255,255,255,.95)'],[.25,'rgba(255,255,255,.45)'],[1,'rgba(255,255,255,0)']]);g.fillRect(0,0,64,64);});
 tex(scene,'fx-soft',128,128,(g)=>{g.fillStyle=rad(g,64,64,64,[[0,'rgba(255,255,255,.6)'],[.4,'rgba(255,255,255,.22)'],[1,'rgba(255,255,255,0)']]);g.fillRect(0,0,128,128);});
 tex(scene,'fx-core',32,32,(g)=>{g.fillStyle=rad(g,16,16,16,[[0,'rgba(255,255,255,1)'],[.35,'rgba(255,255,255,.8)'],[1,'rgba(255,255,255,0)']]);g.fillRect(0,0,32,32);});
 // a downward cone: narrow at the lantern, spreading and fading to the ground
 tex(scene,'fx-cone',128,256,(g,w,h)=>{for(let y=0;y<h;y++){const k=y/h,half=8+k*56,a=(1-k)**1.6*.9*Math.min(1,y/10);
  const gr=g.createLinearGradient(64-half,0,64+half,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,`rgba(255,255,255,${a})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(64-half,y,half*2,1);}});
 tex(scene,'fx-reflect',32,128,(g)=>{for(let y=0;y<128;y+=3){const a=(1-y/128)*.9*(.6+.4*Math.sin(y*.7));g.fillStyle=`rgba(255,255,255,${a})`;const w=10+Math.sin(y*.37)*5;g.fillRect(16-w/2,y,w,2);}});
 const objsWorld=[];

 // ---------- the night ----------
 add(paintLightMap(scene,{bounds,lamps,windows,rain,low,ultra:quality==='ultra',canopies}));

 // ---------- lamps ----------
 const halos=[];
 for(const l of lamps){
  const big=l.kind!=='lantern',k=rain?1.25:1;
  const core=add(scene.add.image(l.x,l.y,'fx-core').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c8).setDisplaySize(big?22:18,big?26:20).setDepth(D.glow));
  const halo=add(scene.add.image(l.x,l.y,'fx-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb860).setDisplaySize(big?140:90,big?132:84).setDepth(D.glow));
  const air=add(scene.add.image(l.x,l.y+10,'fx-soft').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa040).setDisplaySize(l.r*1.7*k,l.r*1.5*k).setDepth(D.glow));
  const cone=l.cone?add(scene.add.image(l.x,l.y+8,'fx-cone').setOrigin(.5,0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc078).setDisplaySize(l.r*.9,l.fy-l.y).setDepth(D.glow)):null;
  const pool=add(scene.add.image(l.fx,l.fy,'fx-soft').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb058).setDisplaySize(l.r*1.7,l.r*.66).setDepth(D.ground));
  halos.push({core,halo,air,cone,pool,ph:Math.random()*9,base:{core:.95,halo:.62,air:rain?.36:.2,cone:rain?.3:.14,pool:rain?.5:.3}});
 }
 for(const [x,y,kind] of windows){const im=add(scene.add.image(x,y,'fx-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(kind==='clock'?0xfff0d0:0xffc06a).setAlpha(kind==='clock'?.16:.22).setDisplaySize(kind==='clock'?92:44,kind==='clock'?84:40).setDepth(D.glow));halos.push({win:im});}
 for(const l of streetLights.slice(0,low?40:100)){const s={lamp:58,lantern:44,window:20,candle:16,bulb:9}[l.kind]||16;
  add(scene.add.image(l.x,l.y,'fx-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc06a).setAlpha(l.kind==='window'?.18:.36).setDisplaySize(s*2,s*1.8).setDepth(l.kind==='bulb'||l.kind==='candle'?6:20));}

 // ---------- puddles hold the lamps ----------
 const reflections=[];
 // wet stone: each lamp is mirrored as a long broken streak running down from its foot
 if(rain)for(const l of lamps){const im=add(scene.add.image(l.fx,l.fy-4,'fx-reflect').setOrigin(.5,0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa850).setAlpha(.3).setDisplaySize(18,Math.min(130,l.r*.55)).setDepth(D.ground));reflections.push({im,a:.3,ph:Math.random()*9,w:18});}
 if(rain)for(const p of puddles){let best=null,bd=1e9;for(const l of lamps){const d=Math.hypot(l.fx-p.x,(l.fy-p.y)*1.6);if(d<bd){bd=d;best=l;}}
  if(!best||bd>best.r*1.6)continue;const a=.6*(1-bd/(best.r*1.6));
  const im=add(scene.add.image(p.x+(best.x-p.x)*.08,p.y-p.w*.12,'fx-reflect').setOrigin(.5,0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb262).setAlpha(a*1.4).setDisplaySize(Math.min(14,p.w*.5),Math.min(46,p.w*1.4)).setDepth(D.ground));
  reflections.push({im,a,ph:Math.random()*9,w:Math.min(14,p.w*.5)});
  // the lamp's warmth spread across the water
  add(scene.add.image(p.x,p.y,'fx-soft').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff9e50).setAlpha(a*.9).setDisplaySize(p.w*2.4,p.w*.75).setDepth(D.ground));}

 // ---------- fireflies ----------
 // They live where the camera is: each one haunts a crown, a hedge or a verge in view, and
 // when its place leaves the view it moves to one that is in it. Under the rain they keep
 // low under the leaves, fewer and slower; on a dry night more of them drift over the grass.
 const flies=[],homes=[...canopies,...lamps.map(l=>({x:l.fx+(Math.random()-.5)*160,y:l.fy-40,r:70,low:1}))];
 const N=rain?(low?8:16):(low?12:26);
 tex(scene,'fx-fly',48,48,(g)=>{g.fillStyle=rad(g,24,24,24,[[0,'rgba(255,255,255,1)'],[.12,'rgba(255,255,255,.85)'],[.35,'rgba(255,255,255,.28)'],[1,'rgba(255,255,255,0)']]);g.fillRect(0,0,48,48);});
 const place=(f,v)=>{const pool=v?homes.filter(h=>h.x>v.x&&h.x<v.x+v.width&&h.y>v.y-60&&h.y<v.y+v.height):homes;const h=(pool.length?pool:homes)[(Math.random()*(pool.length||homes.length))|0];
  f.x=h.x+(Math.random()-.5)*h.r*1.6;f.y=h.y+(h.low?0:h.r*(rain?.55:.8))+Math.random()*(rain?30:90);f.home=h;};
 for(let i=0;i<N&&homes.length;i++){
  const halo=add(scene.add.image(0,0,'fx-fly').setBlendMode(Phaser.BlendModes.ADD).setTint(0xc4ff70).setDisplaySize(34,34).setDepth(D.flies));
  const core=add(scene.add.image(0,0,'fx-core').setBlendMode(Phaser.BlendModes.ADD).setTint(0xf6ffc8).setDisplaySize(6,6).setDepth(D.flies));
  const f={halo,core,ph:Math.random()*20,sp:.22+Math.random()*.3,blink:Math.random()*4,period:2+Math.random()*2.4,range:rain?22:46};place(f);flies.push(f);}

 // ---------- mist ----------
 const mist=[];
 for(let i=0;i<(low?2:5);i++){const im=add(scene.add.image(0,0,'fx-soft').setTint(rain?0x9aa6d0:0x8890b8).setAlpha(0).setDepth(D.mist));mist.push({im,u:Math.random(),v:.55+Math.random()*.4,sp:.006+Math.random()*.01,a:(rain?.16:.07)*(.6+Math.random()*.4)});}

 // ---------- rain ----------
 let layers=[],ripples=[],rings=[],splashes=[],drips=[],litRain=[];
 if(rain){
  const streaks=(key,w,h,n,len,alpha)=>tex(scene,key,w,h,(g)=>{let s=key.length*977;const r=()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
   for(let i=0;i<n;i++){const x=r()*w,y=r()*h,l=len*(.6+r()*.8);g.strokeStyle=`rgba(200,214,240,${alpha*(.5+r()*.5)})`;g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x-l*.08,y+l);g.stroke();
    if(y+l>h){g.beginPath();g.moveTo(x,y-h);g.lineTo(x-l*.08,y-h+l);g.stroke();}}});
  streaks('fx-rain-far',180,240,low?26:40,10,.32);streaks('fx-rain-near',220,300,low?10:18,22,.5);
  for(const [key,speed,alpha] of (low?[['fx-rain-near',900,.5]]:[['fx-rain-far',520,.42],['fx-rain-near',980,.52]])){
   const t=add(scene.add.tileSprite(0,0,16,16,key).setOrigin(0,0).setDepth(D.rain).setAlpha(alpha));layers.push({t,speed,alpha,off:0});}
  // the rain as the lamps catch it: bright streaks only inside each lamp's light
  for(let v=0;v<5;v++)tex(scene,'fx-litrain-'+v,96,160,(g,w,h)=>{let s=v*7919+3;const r=()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
   for(let i=0;i<38;i++){const x=r()*w,y=r()*h,l=8+r()*14,f=Math.max(0,1-Math.hypot((x-w/2)/(w/2),(y-h*.42)/(h*.55)));if(f<=0)continue;
    g.strokeStyle=`rgba(255,255,255,${.85*f})`;g.lineWidth=1.2;g.beginPath();g.moveTo(x,y);g.lineTo(x-l*.08,y+l);g.stroke();}});
  for(const l of lamps){const im=add(scene.add.image(l.x,l.y+l.r*.25,'fx-litrain-0').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd29a).setAlpha(low?.35:.5).setDisplaySize(l.r*.95,l.r*1.5).setDepth(D.glow));litRain.push({im,t:Math.random(),v:0});}
  tex(scene,'fx-ripple',40,16,(g)=>{g.strokeStyle='rgba(205,220,245,.9)';g.lineWidth=1.4;g.beginPath();g.ellipse(20,8,17,6.4,0,0,7);g.stroke();});
  tex(scene,'fx-splash',12,8,(g)=>{g.fillStyle='rgba(215,228,250,.9)';for(const [x,y] of [[1,6],[4,2],[6,0],[8,2],[11,6]])g.fillRect(x,y,1.4,1.4);});
  tex(scene,'fx-drop',3,9,(g)=>{g.fillStyle='rgba(215,228,250,.85)';g.fillRect(0,0,3,9);});
  for(let i=0;i<(low?10:26);i++){const im=add(scene.add.image(0,0,'fx-ripple').setDepth(D.glow).setAlpha(0));ripples.push({im,t:Math.random(),life:.7+Math.random()*.3});}
  // rain falls on all the stone, not only the puddles: small rings and splashes anywhere in view
  for(let i=0;i<(low?8:22);i++){const im=add(scene.add.image(0,0,'fx-ripple').setDepth(D.glow).setAlpha(0));rings.push({im,t:Math.random()*.4});}
  for(let i=0;i<(low?10:28);i++){const im=add(scene.add.image(0,0,'fx-splash').setDepth(D.glow).setAlpha(0));splashes.push({im,t:Math.random()*.3});}
  for(const [x,y0,y1] of eaves){const im=add(scene.add.image(0,0,'fx-drop').setDepth(D.glow).setAlpha(0)),sp=add(scene.add.image(0,0,'fx-splash').setDepth(D.glow).setAlpha(0));drips.push({x,y0,y1,im,sp,t:Math.random()*1.2,period:.9+Math.random()*.9});}
  // drops shaken from the trees' crowns
  for(const h of canopies.slice(0,low?6:14)){const im=add(scene.add.image(0,0,'fx-drop').setDepth(D.glow).setAlpha(0)),sp=add(scene.add.image(0,0,'fx-splash').setDepth(D.glow).setAlpha(0));
   drips.push({x:h.x,y0:h.y+h.r*.6,y1:h.floor||h.y+h.r+80,im,sp,t:Math.random()*3,period:1.6+Math.random()*2.4,jitter:h.r*.8,ox:0});}
 }
 let roofed=0,clock=0;
 const lit=x=>x;  // keep closures small
 return {
  update(dt,cam){
   clock+=dt;const v=cam.worldView,z=cam.zoom,dry=1-roofed;
   for(const h of halos){
    if(h.win)continue;
    const f=1+.05*Math.sin(clock*7+h.ph)+.03*Math.sin(clock*17.3+h.ph*2)+.02*Math.sin(clock*1.3+h.ph);
    h.core.setAlpha(h.base.core*Math.min(1,f));h.halo.setAlpha(h.base.halo*f);h.air.setAlpha(h.base.air*f*(rain?dry*.6+.4:1));h.pool.setAlpha(h.base.pool*f);h.cone?.setAlpha(h.base.cone*f);
   }
   for(const r of reflections)r.im.setAlpha(r.a*(.75+.25*Math.sin(clock*5.3+r.ph))).setDisplaySize(r.w*(.85+.3*Math.sin(clock*3.1+r.ph*2)),r.im.displayHeight);
   for(const f of flies){if(f.home&&(f.x<v.x-40||f.x>v.x+v.width+40||f.y<v.y-40||f.y>v.y+v.height+40))place(f,v);f.ph+=dt*f.sp;f.blink+=dt;const on=Math.max(0,Math.sin(Math.PI*Math.min(1,(f.blink%f.period)/1.4)))**1.5;
    const x=f.x+Math.sin(f.ph)*f.range+Math.sin(f.ph*2.3)*f.range*.3,y=f.y+Math.cos(f.ph*.7)*f.range*.45+Math.sin(f.ph*1.9)*6;
    f.halo.setPosition(x,y).setAlpha(.8*on);f.core.setPosition(x,y).setAlpha(on);}
   for(const m of mist){m.u=(m.u+m.sp*dt)%1.4;m.im.setPosition(v.x+v.width*(m.u-.2),v.y+v.height*m.v).setDisplaySize(v.width*.9,v.height*.35).setAlpha(m.a*dry);}
   if(!rain)return;
   // streaks are sized in CSS px, so a sharper canvas does not turn them into hairlines
   const cv=scene.game.canvas,d=Math.max(1,cv.width/(cv.clientWidth||cv.width)),zs=z/d;
   for(const L of layers){L.off+=dt*L.speed;L.t.setPosition(v.x,v.y).setSize(v.width*zs,v.height*zs).setScale(1/zs);L.t.tilePositionY=-L.off;L.t.tilePositionX=L.off*.08;L.t.setAlpha(L.alpha*dry);}
   for(const r of litRain){r.t+=dt;if(r.t>.06){r.t=0;r.v=(r.v+1+((Math.random()*3)|0))%5;r.im.setTexture('fx-litrain-'+r.v).setFlipX(Math.random()<.5);}r.im.setVisible(dry>.05);}
   const inView=(x,y)=>x>v.x&&x<v.x+v.width&&y>v.y&&y<v.y+v.height;
   for(const r of ripples){r.t+=dt;if(r.t>r.life){r.t=0;r.life=.6+Math.random()*.4;const p=puddles.length?puddles[(Math.random()*puddles.length)|0]:null;
     if(p&&inView(p.x,p.y))r.im.setPosition(p.x+(Math.random()-.5)*p.w*.8,p.y+(Math.random()-.5)*p.w*.15);else{r.im.setAlpha(0);continue;}}
    const k=r.t/r.life;r.im.setScale(.25+k*1.05).setAlpha(.55*(1-k)*dry);}
   for(const r of rings){r.t+=dt;if(r.t>.45){r.t=0;r.im.setPosition(v.x+Math.random()*v.width,v.y+v.height*(.25+Math.random()*.75));}
    const k=r.t/.45;r.im.setScale(.12+k*.4).setAlpha(.3*(1-k)*dry);}
   for(const s of splashes){s.t+=dt;if(s.t>.24){s.t=0;s.im.setPosition(v.x+Math.random()*v.width,v.y+v.height*(.2+Math.random()*.8));}s.im.setAlpha((s.t<.14?.65:0)*dry);}
   for(const d of drips){d.t+=dt;const fall=.36+(d.y1-d.y0)/900;if(d.t>d.period){d.t=0;if(d.jitter)d.ox=(Math.random()-.5)*d.jitter*2;}
    const x=d.x+(d.ox||0);
    if(d.t<fall){const k=(d.t/fall)**2;d.im.setPosition(x,d.y0+(d.y1-d.y0)*k).setAlpha(.8*dry);d.sp.setAlpha(0);}
    else{d.im.setAlpha(0);d.sp.setPosition(x,d.y1).setAlpha(d.t<fall+.16?.75*dry:0);}}
  },
  setRoofed(k){roofed=k;},
  destroy(){for(const o of objs)o.destroy();}
 };
}
