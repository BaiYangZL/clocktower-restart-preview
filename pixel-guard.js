import {poseFor,footSupport} from './gate-story.js';

// Body height in scene units. The gate art's own cues (lamp posts ~195, the notice board,
// crates, the 296-unit doorway) put a grown man at ~110–130; 168 made the doorway look
// barely taller than him.
export const GUARD_H=120;
// The sheet is 运行版-v4 (工具脚本/精修像素护卫.mjs): the v3 cells rebuilt offline on a real
// 2×2 art-pixel grid (96² per cell), hard-edged, one 30-colour palette graded to the night,
// a selective dark contour, plus left/right rim masks for the lamps.
const CELL=96, PAD=8, WARP=CELL+PAD*2, SCALE=GUARD_H/80;

function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}

// Local contact correction of existing poses; no rescaling or replacement art.
function drawTriangle(ctx,image,src,dst){
 const [a,b,c]=src,[p,q,r]=dst;
 const den=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);
 if(Math.abs(den)<.01)return;
 const A=((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/den;
 const B=((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/den;
 const C=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/den;
 const D=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/den;
 // Overlap subpixel clip edges; adjacent triangles otherwise leave hairline seams.
 const centre={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
 const edge=[p,q,r].map(v=>{const dx=v.x-centre.x,dy=v.y-centre.y,n=Math.hypot(dx,dy)||1;return {x:v.x+dx/n*.5,y:v.y+dy/n*.5};});
 ctx.save();ctx.beginPath();ctx.moveTo(edge[0].x,edge[0].y);ctx.lineTo(edge[1].x,edge[1].y);ctx.lineTo(edge[2].x,edge[2].y);ctx.closePath();ctx.clip();
 ctx.setTransform(A,B,C,D,p.x-A*a.x-C*a.y,p.y-B*a.x-D*a.y);
 ctx.drawImage(image,0,0);ctx.restore();
}

export function createPixelGuard(scene,{depth=10,sheet,rims,meta}){
 const NEAREST=Phaser.Textures.FilterMode.NEAREST,keys={main:'pixel-guard-v4',rim:'pixel-guard-v4-rim'};
 // Phaser 4's texture-local sampling keeps texel interiors crisp, with a narrow
 // antialiased edge. Never change global filtering, geometry or the source art.
 const canSmooth=scene.game.renderer.type===Phaser.WEBGL;
 let sampling=canSmooth&&new URLSearchParams(location.search).get('guardSampling')!=='original'?'sharp':'original';
 const setTextureSampling=tex=>{
  tex.setSmoothPixelArt(sampling==='sharp');
  if(sampling==='original')tex.setFilter(NEAREST);
 };
 for(const [k,img] of [[keys.main,sheet],[keys.rim,rims]]){if(scene.textures.exists(k))scene.textures.remove(k);scene.textures.addImage(k,img).setFilter(NEAREST);}
 const tm=scene.textures.get(keys.main),tr=scene.textures.get(keys.rim);
 [tm,tr].forEach(setTextureSampling);
 for(const [id,f] of Object.entries(meta.frames)){const [x,y,w,h]=f.frame;tm.add(id,0,x,y,w,h);tr.add('L:'+id,0,x,y,w,h);tr.add('R:'+id,0,x+meta.rimOffset,y,w,h);}
 // Grounding: a tight dark contact patch under the boots, a soft ambient pool, and a long
 // shadow cast away from the lamps that light him.
 const pool=scene.add.image(0,0,'g-shadow').setDisplaySize(64,15).setAlpha(.4).setDepth(depth-.12);
 const cast=scene.add.image(0,0,'g-shadow').setOrigin(.08,.5).setAlpha(0).setDepth(depth-.11);
 const contact=scene.add.image(0,0,'g-shadow').setDisplaySize(36,7).setAlpha(.8).setDepth(depth-.1);
 const first='S/interactions/0';
 const sprite=scene.add.image(0,0,keys.main,first).setScale(SCALE).setDepth(depth);
 const rimSprites=['L','R'].map((k,i)=>scene.add.image(0,0,keys.rim,k+':'+first).setScale(SCALE).setDepth(depth+.01+i*.001).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffbe78));
 const source=canvas(CELL,CELL),warped=canvas(WARP,WARP),rimLayer=canvas(CELL,CELL);
 const sg=source.getContext('2d'),wg=warped.getContext('2d');
 const rg=rimLayer.getContext('2d');
 sg.imageSmoothingEnabled=wg.imageSmoothingEnabled=rg.imageSmoothingEnabled=false;
 const warpKey='pixel-guard-hands';
 if(scene.textures.exists(warpKey))scene.textures.remove(warpKey);
 const warpTex=scene.textures.addCanvas(warpKey,warped);warpTex.setFilter(NEAREST);
 setTextureSampling(warpTex);
 let last='',shown=true,lastWarp='',lastSource='';
 // palm centres of N/interactions/22 in art pixels of the 96² cell
 const palms={L:{x:18.5,y:30.5},R:{x:80,y:30.5}};
 function deform(id,f,g,foot,rimA){
  const arms=g.arms,blend=g.contact||0,lean=g.lean||0;
  // Bake the same restrained edge light into moving limbs, so light does not float
  // outside the silhouette or disappear when the guard starts pushing/walking.
  const sourceKey=id+':'+rimA.map(a=>Math.round(a*32)).join(',');
  const signature=sourceKey+':'+[arms?g.x:0,arms?g.y:0,arms?.L.x||0,arms?.L.y||0,arms?.R.x||0,arms?.R.y||0,blend,lean,foot?.dx||0,foot?.dy||0].map(n=>n.toFixed(3)).join(',');
  if(signature===lastWarp)return;lastWarp=signature;
  if(sourceKey!==lastSource){
   lastSource=sourceKey;sg.clearRect(0,0,CELL,CELL);sg.drawImage(sheet,f.frame[0],f.frame[1],CELL,CELL,0,0,CELL,CELL);
   for(let i=0;i<2;i++){
    rg.clearRect(0,0,CELL,CELL);rg.drawImage(rims,f.frame[0]+i*meta.rimOffset,f.frame[1],CELL,CELL,0,0,CELL,CELL);
    rg.globalCompositeOperation='source-in';rg.fillStyle='#ffcf9a';rg.fillRect(0,0,CELL,CELL);rg.globalCompositeOperation='source-over';
    sg.globalCompositeOperation='lighter';sg.globalAlpha=Math.round(rimA[i]*32)/32;sg.drawImage(rimLayer,0,0);
   }
   sg.globalAlpha=1;sg.globalCompositeOperation='source-over';
  }
  wg.setTransform(1,0,0,1,0,0);wg.clearRect(0,0,WARP,WARP);
  const shifts={};
  const upper=p=>Math.max(0,Math.min(1,(78-p.y)/38))*lean;
  if(arms)for(const side of ['L','R']){
   const p=palms[side],target=arms[side];
   shifts[side]={x:((target.x-g.x)/SCALE+f.root[0]-p.x-upper(p)*1.2)*blend,y:((target.y-g.y)/SCALE+f.root[1]-p.y+upper(p)*1.6)*blend};
  }
  const xs=foot?[0,foot.x-16,foot.x-8,foot.x,foot.x+8,foot.x+16,96]:[0,18.5,33.5,48,65,80,96];
  const ys=foot?[0,60,70,80,foot.y,96]:[0,17.5,30.5,45,60,78,96];
  const warp=p=>{
   let x=p.x+upper(p)*1.2,y=p.y-upper(p)*1.6;
   if(arms)for(const side of ['L','R']){
    const a=palms[side],w=Math.max(0,1-Math.abs(p.x-a.x)/16)*Math.max(0,1-Math.abs(p.y-a.y)/20);
    x+=shifts[side].x*w;y+=shifts[side].y*w;
   }
   if(foot){
    const w=Math.max(0,1-Math.abs(p.x-foot.x)/16)*Math.max(0,Math.min(1,(p.y-65)/(foot.y-65)));
    x+=foot.dx*w;y+=foot.dy*w;
   }
   return {x:x+PAD,y:y+PAD};
  };
  for(let y=0;y<ys.length-1;y++)for(let x=0;x<xs.length-1;x++){
   const a={x:xs[x],y:ys[y]},b={x:xs[x+1],y:ys[y]},c={x:xs[x],y:ys[y+1]},d={x:xs[x+1],y:ys[y+1]};
   for(const tri of [[a,b,c],[b,d,c]])drawTriangle(wg,source,tri,tri.map(warp));
  }
  warpTex.refresh();
 }
 return {
  update(_dt,g){
   const pose=poseFor(g),ids=meta.clips[pose.clip],id=ids[pose.index],f=meta.frames[id];
   const L=g.light||{warm:0,side:0,dx:0,dy:1},warm=L.warm,side=L.side;
   // Keep the original material contrast. Scene lightmap already supplies ambient
   // darkness; the character needs a small directional tint, not a second heavy grade.
   const rimA=[Math.max(0,-side),Math.max(0,side)].map(s=>warm*(.035+.19*s));
   const foot=footSupport(g),deformed=!!(g.arms||g.lean||foot);
   if(deformed){deform(id,f,g,foot,rimA);sprite.setTexture(warpKey);}
   else if(id!==last||sprite.texture.key!==keys.main){sprite.setTexture(keys.main,id);lastWarp='';}
   if(id!==last)rimSprites.forEach((r,i)=>r.setFrame((i?'R:':'L:')+id));
   last=id;
   const ox=f.root[0]/CELL,oy=f.root[1]/CELL;
   sprite.setOrigin(deformed?(f.root[0]+PAD)/WARP:ox,deformed?(f.root[1]+PAD)/WARP:oy).setPosition(g.x,g.y);
   // Lamp light falls on the side facing it; the far side keeps the cool night ambient.
   const C=Phaser.Display.Color.GetColor;
   const tint=s=>{const k=warm*(.5+s*.5);return C(Math.round(226+29*k),Math.round(229+18*k),Math.round(245-14*k));};
   sprite.setTint(tint(-side),tint(side),0xd6d4df,0xd6d4df);
   rimSprites.forEach((r,i)=>r.setOrigin(ox,oy).setPosition(g.x,g.y).setTint(0xffcf9a).setAlpha(rimA[i]).setVisible(shown&&!deformed));
   pool.setPosition(g.x,g.y+1).setAlpha(foot?.32:.4);
   contact.setPosition(foot?g.x+(foot.x+foot.dx-f.root[0])*SCALE:g.x,foot?g.y+(foot.y+foot.dy-f.root[1])*SCALE:g.y)
    .setDisplaySize(foot?18:32,foot?5:7).setAlpha(foot?.68:.72);
   const len=Math.hypot(L.dx,L.dy)||1;
   cast.setPosition(g.x,g.y).setRotation(Math.atan2(L.dy/len,L.dx/len)).setDisplaySize(40+46*warm,13).setAlpha(.32*Math.min(1,warm*1.3));
   for(const o of [sprite,pool,contact,cast])o.setVisible(shown);
  },
  hide(){shown=false;for(const o of [sprite,pool,contact,cast,...rimSprites])o.setVisible(false);},
  show(){shown=true;},
  get sprite(){return sprite;},
  get frame(){return last;},
  get sampling(){return sampling;},
  setSampling(mode){sampling=canSmooth&&mode==='sharp'?'sharp':'original';[tm,tr,warpTex].forEach(setTextureSampling);},
  destroy(){for(const o of [sprite,pool,contact,cast,...rimSprites])o.destroy();for(const k of [keys.main,keys.rim,warpKey])scene.textures.remove(k);}
 };
}
