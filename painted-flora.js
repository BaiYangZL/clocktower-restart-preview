// Hand-painted foliage for the gate scene, drawn once at load in the look of the gate art:
// clumpy leaf masses with a dark ink outline, a lamp-warm lit side, a cool shaded side and
// small leaf dabs. A tree is a trunk plus several clumps on their own textures, so each clump
// can sway about where it hangs; leaves are shed from the clumps themselves.
import {random} from './journey.js';

export const RES=2;   // texture pixels per scene pixel (the camera magnifies the scene ~1–3×)
const INK='#102019';
// ramps from the gaps between leaf clusters to the lamp-lit tips
export const GREENS={
 lit:['#173329','#285237','#4f7a3a','#86a142','#bdbf55'],
 cool:['#132b28','#204438','#376239','#5d8744','#86a553'],
 near:['#0d1d1b','#16302b','#244533','#3a663c','#5a8648']
};

function canvas(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;}

// One mass of foliage in the gate art's manner: many small scalloped leaf clusters (a round
// heart and six or seven rounded lobes, thin ink edge), the deep green showing in the gaps,
// clusters towards the light paler and yellower, lower ones overlapping upper ones.
export function paintClump(r,{tone='lit',light=[-.6,-.8],seed=1,flat=1}={}){
 const P=GREENS[tone],rnd=random(seed*7919+13),pad=10,S=RES,W=(r*2+pad*2)*S,H=(r*2*flat+pad*2)*S,c=canvas(W,H),g=c.getContext('2d');
 const cx=W/2,cy=H/2,ry=r*flat;
 const ll=Math.hypot(light[0],light[1])||1,lx=light[0]/ll,ly=light[1]/ll;
 // the dark body the clusters sit on
 g.fillStyle=P[0];g.beginPath();
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2,rr=.78+rnd()*.12;const x=cx+Math.cos(a)*r*rr*S,y=cy+Math.sin(a)*ry*rr*S;g.moveTo(x+r*.3*S,y);g.arc(x,y,r*.3*S,0,7);}
 g.moveTo(cx+r*.8*S,cy);g.ellipse(cx,cy,r*.8*S,ry*.8*S,0,0,7);g.fill();
 // clusters on a jittered grid inside the outline, painted top to bottom
 const s0=Math.max(8,r*.24),pts=[];
 for(let y=-ry;y<=ry;y+=s0*.78)for(let x=-r;x<=r;x+=s0*.86){
  const jx=x+(rnd()-.5)*s0*.5,jy=y+(rnd()-.5)*s0*.4;if((jx/r)**2+(jy/ry)**2>.92)continue;pts.push([jx,jy,s0*(.82+rnd()*.36)]);}
 pts.sort((a,b)=>a[1]-b[1]);
 for(const [x,y,s] of pts){
  const px=cx+x*S,py=cy+y*S,ss=s*S;
  // how much this cluster faces the light: its place on the mass, plus a little noise
  const f=clamp(.5+.55*((x*lx+y/flat*ly)/r)+(rnd()-.5)*.25,0,1);
  const base=P[1+Math.min(3,Math.floor(f*3.2))],hi=P[Math.min(4,2+Math.floor(f*2.6))];
  const n=6+Math.floor(rnd()*2),rot=rnd()*7,lobes=[[px,py,ss*.5]];
  for(let i=0;i<n;i++){const a=rot+i/n*Math.PI*2;lobes.push([px+Math.cos(a)*ss*.5,py+Math.sin(a)*ss*.42,ss*(.26+rnd()*.06)]);}
  const shape=(grow,dx=0,dy=0,k=1)=>{g.beginPath();for(const [x2,y2,l] of lobes){const X=px+(x2-px)*k+dx,Y=py+(y2-py)*k+dy;g.moveTo(X+l*k+grow,Y);g.arc(X,Y,l*k+grow,0,7);}};
  g.fillStyle=INK;shape(.9*S);g.fill();
  g.fillStyle=base;shape(0);g.fill();
  // the lit half of the cluster, then a few tip highlights
  g.save();shape(0);g.clip();
  g.fillStyle=hi;g.globalAlpha=.9;shape(0,lx*ss*.16,ly*ss*.16,.82);g.fill();
  g.fillStyle=P[Math.max(0,P.indexOf(base)-1)];g.globalAlpha=.55;shape(0,-lx*ss*.34,-ly*ss*.3,.9);g.fill();
  if(f>.45){g.fillStyle=P[4];g.globalAlpha=.6*f;for(let i=1;i<lobes.length;i+=2){const [x2,y2,l]=lobes[i];if((x2-px)*lx+(y2-py)*ly<0)continue;g.beginPath();g.ellipse(x2+lx*l*.25,y2+ly*l*.25,l*.45,l*.32,0,0,7);g.fill();}}
  g.restore();
  // a thin vein between the heart and the lobes on the shaded side
  g.strokeStyle=INK;g.globalAlpha=.35;g.lineWidth=.6*S;g.beginPath();g.arc(px,py,ss*.32,Math.atan2(-ly,-lx)-.9,Math.atan2(-ly,-lx)+.9);g.stroke();g.globalAlpha=1;
 }
 return {canvas:c,ox:cx/S,oy:cy/S};
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// trunk and limbs as one texture; returns the points where the clumps hang
export function paintTrunk(h,{seed=1,lean=0,limbs=[]}={}){
 const S=RES,W=(h*.9+20)*S,H=(h+14)*S,c=canvas(W,H),g=c.getContext('2d'),bx=W/2,by=H-8*S;
 const pts=[];
 const limb=(x0,y0,x1,y1,w0,w1)=>{
  const mx=(x0+x1)/2+(y1-y0)*.12,my=(y0+y1)/2;
  const side=(t,w)=>{const nx=-(y1-y0),ny=x1-x0,l=Math.hypot(nx,ny);return [nx/l*w,ny/l*w];};
  const [ax,ay]=side(0,w0*S/2),[bx2,by2]=side(1,w1*S/2);
  g.beginPath();g.moveTo(x0+ax,y0+ay);g.quadraticCurveTo(mx+ax,my+ay,x1+bx2,y1+by2);g.lineTo(x1-bx2,y1-by2);g.quadraticCurveTo(mx-ax,my-ay,x0-ax,y0-ay);g.closePath();
 };
 const top=[bx+lean*h*.25*S,by-h*.72*S];
 const draw=(fill,grow)=>{g.fillStyle=fill;g.lineJoin='round';
  limb(bx,by,top[0],top[1],h*.16+grow,h*.09+grow);g.fill();
  for(const [u,dx,dy,w] of limbs){const sx=bx+(top[0]-bx)*u,sy=by+(top[1]-by)*u;limb(sx,sy,sx+dx*S,sy+dy*S,w+grow,w*.45+grow);g.fill();}
  // flared roots
  g.beginPath();g.ellipse(bx,by,(h*.14+grow)*S,(h*.035+grow*.5)*S,0,0,7);g.fill();};
 draw(INK,2.2);draw('#5a3b26',0);
 // bark: a lit edge and a few dark grooves
 g.save();g.globalCompositeOperation='source-atop';
 g.fillStyle='#8a5e3a';g.globalAlpha=.8;g.fillRect(bx-h*.02*S,0,h*.06*S,H);
 g.fillStyle='#3a2416';g.globalAlpha=.7;g.fillRect(bx+h*.05*S,0,h*.05*S,H);
 g.strokeStyle='#2b1a10';g.lineWidth=.8*S;g.globalAlpha=.6;const rnd=random(seed*31+5);
 for(let i=0;i<10;i++){const y=by-rnd()*h*.7*S,x=bx+(rnd()-.5)*h*.1*S;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rnd()-.5)*2*S,y-(6+rnd()*10)*S);g.stroke();}
 g.restore();
 pts.push({x:(top[0]-bx)/S,y:(top[1]-by)/S});
 for(const [u,dx,dy] of limbs){const sx=(top[0]-bx)*u/S,sy=(top[1]-by)*u/S;pts.push({x:sx+dx,y:sy+dy});}
 return {canvas:c,ox:bx/S,oy:by/S,tips:pts};
}

let texId=0;
function addTex(scene,c){const key='flora-'+(texId++);scene.textures.addCanvas(key,c).setFilter(Phaser.Textures.FilterMode.LINEAR);return key;}

// A tree standing at (x,y) in scene px. clumps: [dx,dy,r,tone,flat] relative to the base.
export function makeTree(scene,{x,y,depth,trunk,clumps,seed=1,light,stiff=1}){
 const parts=[],objs=[];
 if(trunk){const t=paintTrunk(trunk.h,{seed,lean:trunk.lean||0,limbs:trunk.limbs||[]});
  const im=scene.add.image(x,y,addTex(scene,t.canvas)).setOrigin(t.ox/(t.canvas.width/RES),t.oy/(t.canvas.height/RES)).setScale(1/RES).setDepth(depth);objs.push(im);}
 clumps.forEach(([dx,dy,r,tone,flat],i)=>{
  const p=paintClump(r,{tone,light,seed:seed*17+i,flat:flat||1}),key=addTex(scene,p.canvas);
  const im=scene.add.image(x+dx,y+dy,key).setScale(1/RES).setDepth(depth+.01+i*.001);objs.push(im);
  // it sways about a point above-and-toward the trunk, more the higher and further out it is
  parts.push({im,x:x+dx,y:y+dy,r,amp:(.008+.006*Math.min(1,-dy/160))/stiff,ph:seed*1.7+i*.9,hx:-dx*.25,hy:r*.6});
 });
 let t=0;
 return {objs,parts,
  update(dt,wind){t+=dt;
   for(const p of parts){const a=p.amp*(Math.sin(t*1.25+p.ph)+.45*Math.sin(t*2.9+p.ph*1.3))*wind+p.amp*.6*(wind-1);
    // rotate about the hanging point (hx,hy below the clump centre)
    const c=Math.cos(a),s=Math.sin(a);p.im.setRotation(a).setPosition(p.x+p.hx-(p.hx*c-p.hy*s),p.y+p.hy-(p.hx*s+p.hy*c));}},
  destroy(){for(const o of objs)o.destroy();}};
}

// A low bush or hedge mass: clumps only, gentle sway.
export function makeBush(scene,opts){return makeTree(scene,{...opts,trunk:null,stiff:(opts.stiff||2.4)});}

// Falling leaves: shed from the clumps of the given trees, carried by the wind, fluttering,
// landing on the ground line under their tree and fading there.
export function makeLeaves(scene,{trees,depth,rate=.5,low=false,rain=false}){
 const keys=['#8fb257','#6f9a46','#b5c766','#a07f3a'].map((col,i)=>{const k='leaf-'+i;if(!scene.textures.exists(k)){const c=canvas(10*RES,6*RES),g=c.getContext('2d');
  g.translate(5*RES,3*RES);g.fillStyle=INK;g.beginPath();g.ellipse(0,0,4.6*RES,2.4*RES,0,0,7);g.fill();g.fillStyle=col;g.beginPath();g.ellipse(0,0,3.8*RES,1.7*RES,0,0,7);g.fill();
  g.strokeStyle='#2c3f22';g.lineWidth=.5*RES;g.beginPath();g.moveTo(-3.6*RES,0);g.lineTo(3.6*RES,0);g.stroke();scene.textures.addCanvas(k,c);}return k;});
 const pool=[],n=low?8:20;
 for(let i=0;i<n;i++){const im=scene.add.image(0,0,keys[i%keys.length]).setScale(1/RES).setDepth(depth).setVisible(false);pool.push({im,on:false});}
 const rnd=random(4242);let acc=0;
 const spawn=()=>{const f=pool.find(p=>!p.on);if(!f)return;const tr=trees[(rnd()*trees.length)|0],c=tr.parts[(rnd()*tr.parts.length)|0];
  const a=rnd()*7;Object.assign(f,{on:true,x:c.im.x+Math.cos(a)*c.r*.7,y:c.im.y+Math.sin(a)*c.r*.5,floor:tr.floor??(c.im.y+c.r+90+rnd()*60),vy:rain?34:14+rnd()*10,ph:rnd()*7,spin:(rnd()-.5)*5,rest:0,a:1});
  f.im.setVisible(true).setAlpha(1);};
 return {
  update(dt,wind){acc+=dt*rate*(rain?.6:1)*wind;while(acc>1){acc-=1;spawn();}
   for(const f of pool){if(!f.on)continue;
    if(f.rest>0){f.rest+=dt;f.im.setAlpha(Math.max(0,1-(f.rest-1.5)/1.2));if(f.rest>2.7){f.on=false;f.im.setVisible(false);}continue;}
    f.ph+=dt*3;f.y+=f.vy*dt;f.x+=(10*wind+Math.sin(f.ph)*16)*dt;
    f.im.setPosition(f.x,f.y).setRotation(Math.sin(f.ph*.8)*1.2+f.spin*.1).setScale(1/RES,(1/RES)*(.45+.55*Math.abs(Math.cos(f.ph))));
    if(f.y>=f.floor){f.rest=.001;f.im.setScale(1/RES,.6/RES);}}},
  destroy(){for(const f of pool)f.im.destroy();}};
}
