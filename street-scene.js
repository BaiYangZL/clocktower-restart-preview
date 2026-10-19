// The street just inside the gate, painted once at load in the gate art's manner (ink
// outlines, soft blocks of colour, warm lamp pools on a cool night), for the richness of the
// street reference: a tavern and timber houses round a small square, a laid feast table,
// lamp posts, strings of pennants and lights, barrels, crates, planters, a well, and
// townsfolk. It is the scene's last view, not a world to walk in: nothing here is a new
// mechanic. The swaying trees and the townsfolk are separate runtime objects.
import {random,clamp} from './journey.js';

export const STREET={w:1400,h:1000};
const U=30,OX=700,OY=150,INK='#14101a';
// isometric 2:1: X runs down-right, Y down-left, Z up (all in metres-ish)
export const iso=(X,Y,Z=0)=>({x:OX+(X-Y)*U,y:OY+(X+Y)*U/2-Z*U*.92});
// lamps (X,Y,Z of the flame) and where the townsfolk stand
export const STREET_LAMPS=[[5.5,10.5,3],[13.5,4.5,3],[16,13,3],[3,16.5,3],[10.2,7.6,2.4]];
export const FOLK=[
 {X:9.2,Y:10.6,hair:'#2a2230',coat:'#6b3a52',skirt:true,face:1},{X:11.6,Y:12.4,hair:'#d9b36a',coat:'#3c5a7a',face:-1},
 {X:8.1,Y:13.5,hair:'#5a3622',coat:'#5d6b3a',face:1,mug:true},{X:12.9,Y:9.2,hair:'#b8b8c4',coat:'#7a5a2e',face:-1,hat:true},
 {X:6.2,Y:7.4,hair:'#3a2a1e',coat:'#8a3a30',face:1},{X:15.4,Y:10.8,hair:'#e0d0b0',coat:'#4a3a5e',skirt:true,face:-1,mug:true},
 {X:4.4,Y:12.8,hair:'#1e1a22',coat:'#2f5a58',face:1,hat:true}
];

function poly(g,pts){g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(const p of pts.slice(1))g.lineTo(p.x,p.y);g.closePath();}
function inked(g,pts,fill,w=2){poly(g,pts);g.fillStyle=fill;g.fill();g.lineWidth=w;g.strokeStyle=INK;g.lineJoin='round';g.stroke();}
const shadeHex=(hex,k)=>{const n=parseInt(hex.slice(1),16),f=c=>Math.round(clamp(c*k/255)*255);return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;};

// an axis-aligned box: x0..x1 along X, y0..y1 along Y, z0..z1; draws the two faces we see and the top
function box(g,x0,y0,x1,y1,z0,z1,{side,front,top,ink=2}){
 const P=(X,Y,Z)=>iso(X,Y,Z);
 if(front)inked(g,[P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)],front,ink);   // faces +Y (down-left)
 if(side)inked(g,[P(x1,y1,z0),P(x1,y0,z0),P(x1,y0,z1),P(x1,y1,z1)],side,ink);     // faces +X (down-right)
 if(top)inked(g,[P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)],top,ink);
}

function cobbles(g,rnd){
 // night ground, then rows of rounded setts with ink seams
 g.fillStyle='#4b4552';g.fillRect(0,0,STREET.w,STREET.h);
 for(let X=-14;X<34;X+=.5)for(let Y=-14;Y<34;Y+=.5){
  const p=iso(X+(rnd()-.5)*.08,Y+(rnd()-.5)*.08);if(p.x<-20||p.x>STREET.w+20||p.y<-20||p.y>STREET.h+20)continue;
  const v=rnd(),c=v<.33?'#7d7480':v<.66?'#8a8090':'#6f6876';
  g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y,U*.27,U*.15,0,0,7);g.fill();
  g.fillStyle=c;g.beginPath();g.ellipse(p.x,p.y-.6,U*.23,U*.12,0,0,7);g.fill();
  g.fillStyle='rgba(255,240,230,.18)';g.beginPath();g.ellipse(p.x-2,p.y-2.2,U*.12,U*.05,0,0,7);g.fill();
 }
 // a worn path of larger flags from the gate (bottom) to the well
 for(let i=0;i<14;i++){const t=i/13,X=10+(rnd()-.5)*.8,Y=24-t*12+(rnd()-.5)*.4,p=iso(X+t*1.5,Y);
  g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y,U*.62,U*.3,0,0,7);g.fill();g.fillStyle='#9a8e96';g.beginPath();g.ellipse(p.x,p.y-1,U*.56,U*.26,0,0,7);g.fill();}
}

function house(g,rnd,{x,y,w,d,h,wall='#d8c6a2',timber='#4a3022',roof='#3a3f5e',door=true,sign=null,lit=[]}){
 const base=Math.min(.9,h*.2);
 // stone plinth
 box(g,x,y,x+w,y+d,0,base,{front:'#7c7480',side:'#635c6c'});
 // plaster walls
 box(g,x,y,x+w,y+d,base,h,{front:wall,side:shadeHex(wall,.74)});
 // timber frame on the upper storey of both faces
 g.strokeStyle=timber;g.lineWidth=4;g.lineCap='square';
 const beamF=(X0,Z0,X1,Z1)=>{const a=iso(X0,y+d,Z0),b=iso(X1,y+d,Z1);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();};
 const beamS=(Y0,Z0,Y1,Z1)=>{const a=iso(x+w,Y0,Z0),b=iso(x+w,Y1,Z1);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();};
 const mid=h*.52;
 beamF(x,mid,x+w,mid);beamF(x,h-.05,x+w,h-.05);beamS(y,mid,y+d,mid);beamS(y,h-.05,y+d,h-.05);
 for(let i=0;i<=w;i+=w/Math.max(2,Math.round(w/1.4))){beamF(x+i,mid,x+i,h);}
 for(let i=0;i<=d;i+=d/Math.max(2,Math.round(d/1.4))){beamS(y+i,mid,y+i,h);}
 for(let i=0;i+1.4<=w;i+=2.8)beamF(x+i,mid,x+i+1.4,h);
 // windows: lit ones glow, dark ones show the night sky
 const win=(face,u,z,wd=.8,ht=.9,on=true)=>{
  const c=face==='F'?[iso(x+u,y+d,z),iso(x+u+wd,y+d,z),iso(x+u+wd,y+d,z+ht),iso(x+u,y+d,z+ht)]:[iso(x+w,y+d-u,z),iso(x+w,y+d-u-wd,z),iso(x+w,y+d-u-wd,z+ht),iso(x+w,y+d-u,z+ht)];
  inked(g,c,on?'#ffcf76':'#2b3350',3);
  if(on){poly(g,c);const gr=g.createLinearGradient(c[0].x,c[3].y,c[0].x,c[0].y);gr.addColorStop(0,'#fff0b8');gr.addColorStop(1,'#f0a24a');g.fillStyle=gr;g.fill();}
  g.strokeStyle=timber;g.lineWidth=2.4;const m1={x:(c[0].x+c[1].x)/2,y:(c[0].y+c[1].y)/2},m2={x:(c[3].x+c[2].x)/2,y:(c[3].y+c[2].y)/2};
  g.beginPath();g.moveTo(m1.x,m1.y);g.lineTo(m2.x,m2.y);g.moveTo((c[0].x+c[3].x)/2,(c[0].y+c[3].y)/2);g.lineTo((c[1].x+c[2].x)/2,(c[1].y+c[2].y)/2);g.stroke();
  // sill and flower box
  const s0=c[0],s1=c[1];g.fillStyle='#5a3a26';g.beginPath();g.moveTo(s0.x-2,s0.y+1);g.lineTo(s1.x+2,s1.y+1);g.lineTo(s1.x+2,s1.y+6);g.lineTo(s0.x-2,s0.y+6);g.closePath();g.fill();g.strokeStyle=INK;g.lineWidth=1.5;g.stroke();
  if(rnd()<.6)for(let k=0;k<5;k++){const t=(k+.5)/5,px=s0.x+(s1.x-s0.x)*t,py=s0.y+(s1.y-s0.y)*t;g.fillStyle=['#d8506a','#f0d060','#e88ab0','#9a6ad0'][(rnd()*4)|0];g.beginPath();g.arc(px,py-1,2.2,0,7);g.fill();}
  if(on)lit.push({x:(c[0].x+c[2].x)/2,y:(c[0].y+c[2].y)/2,kind:'window'});
 };
 for(let u=.5;u+.8<w;u+=1.6){win('F',u,base+.5,.8,.95,rnd()<.75);win('F',u,mid+.35,.8,.95,rnd()<.6);}
 for(let u=.5;u+.8<d;u+=1.6){win('S',u,base+.5,.8,.95,rnd()<.7);win('S',u,mid+.35,.8,.95,rnd()<.5);}
 if(door){const u=w*.5-.45,c=[iso(x+u,y+d,base),iso(x+u+.9,y+d,base),iso(x+u+.9,y+d,base+1.8),iso(x+u,y+d,base+1.8)];
  inked(g,c,'#5a3422',3);g.fillStyle='#ffd88a';const t=iso(x+u+.45,y+d,base+1.45);g.beginPath();g.arc(t.x,t.y,4,0,7);g.fill();
  box(g,x+u-.15,y+d,x+u+1.05,y+d+.35,0,base,{front:'#8a8290',side:'#6c6474',top:'#9c94a0'});}
 // gable roof, ridge along X
 const eave=.35,R=(X,Y,Z)=>iso(X,Y,Z),rz=h+d*.55;
 inked(g,[R(x-eave,y+d+eave,h-.1),R(x+w+eave,y+d+eave,h-.1),R(x+w+eave,y+d/2,rz),R(x-eave,y+d/2,rz)],roof,3);
 inked(g,[R(x+w,y+d,h),R(x+w,y,h),R(x+w,y+d/2,rz)],shadeHex(wall,.66),3);    // gable end
 // slate courses
 g.save();poly(g,[R(x-eave,y+d+eave,h-.1),R(x+w+eave,y+d+eave,h-.1),R(x+w+eave,y+d/2,rz),R(x-eave,y+d/2,rz)]);g.clip();
 for(let k=1;k<8;k++){const t=k/8,a=R(x-eave,y+d+eave-(d/2+eave)*t,h-.1+(rz-h+.1)*t),b=R(x+w+eave,y+d+eave-(d/2+eave)*t,h-.1+(rz-h+.1)*t);
  g.strokeStyle='rgba(10,10,24,.55)';g.lineWidth=1.6;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
  for(let s=0;s<w+eave*2;s+=.45){const q=R(x-eave+s+(k%2)*.22,y+d+eave-(d/2+eave)*t,h-.1+(rz-h+.1)*t),q2=R(x-eave+s+(k%2)*.22,y+d+eave-(d/2+eave)*(t-1/8),h-.1+(rz-h+.1)*(t-1/8));
   g.beginPath();g.moveTo(q.x,q.y);g.lineTo(q2.x,q2.y);g.stroke();}}
 g.fillStyle='rgba(150,160,210,.16)';g.fillRect(0,0,STREET.w,STREET.h);
 g.restore();
 // chimney
 const cx0=x+w*.72;box(g,cx0,y+d*.3,cx0+.6,y+d*.3+.6,rz-.6,rz+.9,{front:'#8a6a5a',side:'#6a4e44',top:'#2a1e1e'});
 // hanging sign: an iron bracket and a painted board with a bell
 if(sign){const a=iso(x+w*.2,y+d,h*.62),b=iso(x+w*.2-.1,y+d+1.1,h*.62);g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
  const bx=b.x,by=b.y+6;g.strokeStyle=INK;g.lineWidth=1.5;g.beginPath();g.moveTo(bx-12,by-6);g.lineTo(bx-12,by);g.moveTo(bx+12,by-6+6);g.lineTo(bx+12,by+6);g.stroke();
  inked(g,[{x:bx-20,y:by},{x:bx+20,y:by+8},{x:bx+20,y:by+34},{x:bx-20,y:by+26}],'#7a4a2c',2.5);
  g.fillStyle='#e0b85e';g.beginPath();g.moveTo(bx-6,by+24);g.quadraticCurveTo(bx-6,by+8,bx,by+9);g.quadraticCurveTo(bx+6,by+10,bx+6,by+26);g.closePath();g.fill();g.beginPath();g.arc(bx,by+27,2.4,0,7);g.fill();}
}

function lampPost(g,X,Y,lit){
 const b=iso(X,Y,0),t=iso(X,Y,3);
 g.fillStyle=INK;g.fillRect(b.x-4,t.y,8,b.y-t.y);g.fillStyle='#2c2a36';g.fillRect(b.x-2.5,t.y,5,b.y-t.y);
 g.fillStyle=INK;g.beginPath();g.ellipse(b.x,b.y,9,4,0,0,7);g.fill();
 inked(g,[{x:t.x-9,y:t.y-2},{x:t.x+9,y:t.y-2},{x:t.x+7,y:t.y-20},{x:t.x-7,y:t.y-20}],'#ffd27a',2.5);
 g.fillStyle='#fff3c4';g.fillRect(t.x-4,t.y-16,8,11);
 inked(g,[{x:t.x-11,y:t.y-20},{x:t.x+11,y:t.y-20},{x:t.x,y:t.y-30}],'#2c2a36',2);
 lit.push({x:t.x,y:t.y-10,kind:'lamp'});
}
function barrel(g,X,Y){const p=iso(X,Y,0),h=26;g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y,12,6,0,0,7);g.fill();g.fillRect(p.x-12,p.y-h,24,h);
 g.fillStyle='#7a4a2a';g.fillRect(p.x-10,p.y-h,20,h);g.fillStyle='#9a6234';g.fillRect(p.x-6,p.y-h,5,h);
 g.fillStyle='#3a3238';g.fillRect(p.x-11,p.y-h+6,22,3);g.fillRect(p.x-11,p.y-8,22,3);
 g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y-h,12,6,0,0,7);g.fill();g.fillStyle='#8a5a32';g.beginPath();g.ellipse(p.x,p.y-h,10,4.6,0,0,7);g.fill();}
function crate(g,X,Y,s=.7,z=0){box(g,X,Y,X+s,Y+s,z,z+s,{front:'#9a6a3c',side:'#7a5230',top:'#b0804c'});const a=iso(X,Y+s,z),b=iso(X+s,Y+s,z+s);g.strokeStyle='#4a2e1a';g.lineWidth=2;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
function planter(g,rnd,X,Y,w){box(g,X,Y,X+w,Y+.5,0,.5,{front:'#7a5236',side:'#5e3e28',top:'#3a2a1a'});
 for(let i=0;i<w*7;i++){const p=iso(X+rnd()*w,Y+rnd()*.5,.55+rnd()*.25);g.fillStyle=['#e05a6e','#f2d35e','#f0f0e0','#a47ad8','#ef8a50'][(rnd()*5)|0];g.strokeStyle=INK;g.lineWidth=1;g.beginPath();g.arc(p.x,p.y,2.6,0,7);g.fill();g.stroke();}
 for(let i=0;i<w*4;i++){const p=iso(X+rnd()*w,Y+rnd()*.5,.5);g.fillStyle='#3f7a3e';g.beginPath();g.ellipse(p.x,p.y,4,2.4,rnd()*3,0,7);g.fill();}}
function well(g,X,Y){const c=iso(X,Y,0);
 for(const [z,col] of [[0,'#6a6274'],[.5,'#8a8294']]){g.fillStyle=INK;g.beginPath();g.ellipse(c.x,c.y-z*U*.92,40,20,0,0,7);g.fill();g.fillStyle=col;g.beginPath();g.ellipse(c.x,c.y-z*U*.92,37,18,0,0,7);g.fill();}
 g.fillStyle='#1a2236';g.beginPath();g.ellipse(c.x,c.y-.55*U*.92,27,12,0,0,7);g.fill();g.fillStyle='rgba(160,180,230,.35)';g.beginPath();g.ellipse(c.x-6,c.y-.6*U*.92,10,4,0,0,7);g.fill();
 // stones on the rim
 for(let a=0;a<6.28;a+=.45){g.strokeStyle='rgba(20,16,26,.6)';g.lineWidth=1.5;g.beginPath();g.moveTo(c.x+Math.cos(a)*37,c.y-.5*U*.92+Math.sin(a)*18);g.lineTo(c.x+Math.cos(a)*30,c.y-.5*U*.92+Math.sin(a)*14);g.stroke();}
 // posts and little roof
 for(const s of [-1,1]){g.fillStyle=INK;g.fillRect(c.x+s*30-4,c.y-82,8,64);g.fillStyle='#6a4428';g.fillRect(c.x+s*30-2.5,c.y-80,5,62);}
 inked(g,[{x:c.x-46,y:c.y-74},{x:c.x+46,y:c.y-74},{x:c.x+30,y:c.y-104},{x:c.x-30,y:c.y-104}],'#7a3a3e',2.5);
 g.strokeStyle='#4a3022';g.lineWidth=3;g.beginPath();g.moveTo(c.x-30,c.y-62);g.lineTo(c.x+30,c.y-62);g.stroke();
 g.strokeStyle='#c8b080';g.lineWidth=1.2;g.beginPath();g.moveTo(c.x+4,c.y-62);g.lineTo(c.x+4,c.y-36);g.stroke();
 g.fillStyle='#6a4428';g.fillRect(c.x,c.y-38,9,8);}
function feast(g,rnd,lit){
 // a long table under the strings of lights, cloth in the gate banners' plum, a cream runner
 const x0=7,x1=13.5,y0=11,y1=12.2,z=1.05;
 for(const X of [x0+.3,x1-.3])for(const Y of [y0+.2,y1-.2]){const a=iso(X,Y,0),b=iso(X,Y,z);g.fillStyle=INK;g.fillRect(a.x-3,b.y,6,a.y-b.y);g.fillStyle='#5a3a24';g.fillRect(a.x-1.5,b.y,3,a.y-b.y);}
 box(g,x0,y0,x1,y1,z-.08,z,{front:'#4a2e1e',side:'#3a2416',top:'#6a2c3e'});
 inked(g,[iso(x0-.05,y1+.02,z),iso(x1+.05,y1+.02,z),iso(x1+.05,y1+.02,z-.42),iso(x0-.05,y1+.02,z-.42)],'#5e2434',2);     // cloth drop
 g.fillStyle='#4a1c2a';for(let i=0;i<14;i++){const t=(i+.5)/14,a=iso(x0+(x1-x0)*t,y1+.02,z-.05),b=iso(x0+(x1-x0)*t,y1+.02,z-.4);g.fillRect(a.x-1,b.y,2,a.y-b.y);}
 inked(g,[iso(x0,y0+.45,z+.001),iso(x1,y0+.45,z+.001),iso(x1,y0+.75,z+.001),iso(x0,y0+.75,z+.001)],'#e8dcc0',1.2);
 // the spread: plates, loaves, fruit, a roast, jugs, candles
 for(let X=x0+.45;X<x1-.3;X+=.8)for(const Y of [y0+.25,y1-.25]){const p=iso(X,Y,z);g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y,8.5,4.4,0,0,7);g.fill();g.fillStyle='#f0e8d6';g.beginPath();g.ellipse(p.x,p.y,7.2,3.4,0,0,7);g.fill();
  const v=rnd();g.fillStyle=v<.3?'#c86a3a':v<.6?'#8aa64a':'#d8a24a';g.beginPath();g.ellipse(p.x,p.y-1,3.6,2,0,0,7);g.fill();}
 const items=[[8,'loaf'],[9.4,'fruit'],[10.6,'roast'],[11.8,'fruit'],[12.8,'loaf']];
 for(const [X,k] of items){const p=iso(X,y0+.6,z);
  if(k==='loaf'){g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y-3,13,7,-.2,0,7);g.fill();g.fillStyle='#c0803e';g.beginPath();g.ellipse(p.x,p.y-4,11,5.6,-.2,0,7);g.fill();g.strokeStyle='#e8b070';g.lineWidth=1.5;for(const o of [-4,0,4]){g.beginPath();g.moveTo(p.x+o-2,p.y-7);g.lineTo(p.x+o+2,p.y-2);g.stroke();}}
  if(k==='fruit'){g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y,13,6,0,0,7);g.fill();g.fillStyle='#8a5a30';g.beginPath();g.ellipse(p.x,p.y,11,4.8,0,0,7);g.fill();
   for(const [dx,dy,c] of [[-5,-4,'#d84a3a'],[1,-5,'#e0c040'],[5,-3,'#9ac04a'],[-1,-8,'#7a3a8a'],[4,-8,'#d84a3a']]){g.fillStyle=INK;g.beginPath();g.arc(p.x+dx,p.y+dy,4.2,0,7);g.fill();g.fillStyle=c;g.beginPath();g.arc(p.x+dx,p.y+dy,3.2,0,7);g.fill();}}
  if(k==='roast'){g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y,18,8,0,0,7);g.fill();g.fillStyle='#d8d0c0';g.beginPath();g.ellipse(p.x,p.y,16,6.6,0,0,7);g.fill();g.fillStyle=INK;g.beginPath();g.ellipse(p.x,p.y-4,11,7,0,0,7);g.fill();g.fillStyle='#a8562a';g.beginPath();g.ellipse(p.x,p.y-5,9.5,5.6,0,0,7);g.fill();g.fillStyle='#d08048';g.beginPath();g.ellipse(p.x-3,p.y-7,4,2,0,0,7);g.fill();}}
 for(const X of [7.6,9.9,12.3,13.1]){const p=iso(X,y1-.55,z);g.fillStyle=INK;g.fillRect(p.x-4.5,p.y-15,9,15);g.fillStyle='#7a6a8a';g.fillRect(p.x-3.2,p.y-14,6.4,13);g.fillStyle='#a898b8';g.fillRect(p.x-3.2,p.y-14,2,13);}
 for(const X of [8.6,11.2,13]){const p=iso(X,y0+.6,z);g.fillStyle=INK;g.fillRect(p.x-3,p.y-16,6,16);g.fillStyle='#efe6cc';g.fillRect(p.x-2,p.y-15,4,15);lit.push({x:p.x,y:p.y-20,kind:'candle'});}
 // benches either side
 for(const Y of [y0-.55,y1+.25])box(g,x0+.2,Y,x1-.2,Y+.32,.42,.52,{front:'#6a4428',side:'#54361e',top:'#8a5a34'});
}
function bunting(g,rnd,a,b,sag,lit){
 const N=14,pts=[];for(let i=0;i<=N;i++){const t=i/N;pts.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t+Math.sin(t*Math.PI)*sag});}
 g.strokeStyle='#2a2230';g.lineWidth=1.5;g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(const p of pts)g.lineTo(p.x,p.y);g.stroke();
 for(let i=0;i<N;i++){const p=pts[i],q=pts[i+1];
  if(i%2===0){g.fillStyle=['#7a3a6a','#c8a040','#3a5a7a','#8a2a34'][(i/2)%4];g.strokeStyle=INK;g.lineWidth=1.2;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.lineTo((p.x+q.x)/2,(p.y+q.y)/2+14);g.closePath();g.fill();g.stroke();}
  else lit.push({x:(p.x+q.x)/2,y:(p.y+q.y)/2+3,kind:'bulb'});}
}

export function paintStreet({weather='clear',scale=1}={}){
 const S=scale,c=document.createElement('canvas');c.width=STREET.w*S;c.height=STREET.h*S;const g=c.getContext('2d');g.scale(S,S);
 const rnd=random(20261019),lights=[];
 cobbles(g,rnd);
 // back row (top of the view) to front, so nearer things overlap farther ones
 house(g,rnd,{x:-1,y:-2,w:4,d:3.2,h:4.2,wall:'#cdb898',roof:'#3a3a58',lit:lights});
 house(g,rnd,{x:4.2,y:-3,w:5.2,d:3.6,h:5,wall:'#d8c6a2',roof:'#4a3348',sign:'bell',lit:lights});     // the tavern
 house(g,rnd,{x:10.4,y:-2.4,w:3.8,d:3.4,h:4.4,wall:'#c9b8a6',roof:'#2f4054',lit:lights});
 house(g,rnd,{x:15,y:-1.4,w:4.6,d:3.2,h:4,wall:'#d6c0a0',roof:'#3a3a58',lit:lights});
 house(g,rnd,{x:-5,y:3,w:3,d:4.2,h:4.6,wall:'#cbb79a',roof:'#45324a',door:false,lit:lights});
 house(g,rnd,{x:19.6,y:4,w:3.4,d:4.6,h:4.2,wall:'#d2bea0',roof:'#2f4054',lit:lights});
 // in front of the tavern: barrels, crates, a planter
 barrel(g,6,1.4);barrel(g,6.8,1.7);barrel(g,6.3,2.2);crate(g,8.6,1.2);crate(g,9.3,1.3);crate(g,8.9,1.1,.55,.7);
 planter(g,rnd,11,1.6,2.2);planter(g,rnd,1,1.8,1.8);planter(g,rnd,15.6,2.4,2.4);
 well(g,15.5,7.5);
 bunting(g,rnd,iso(4.6,.6,4.2),iso(13.8,4.2,3.4),36,lights);bunting(g,rnd,iso(2.6,10.4,3.2),iso(16.2,12.8,3.2),30,lights);
 feast(g,rnd,lights);
 for(const [X,Y] of STREET_LAMPS.slice(0,4))lampPost(g,X,Y,lights);
 crate(g,17.4,9.6);crate(g,17.4,10.4);barrel(g,18.2,10.2);
 planter(g,rnd,1.5,14.5,2);planter(g,rnd,17.5,15.5,2);
 // night grade: cool everything, then pool the lamp and window light back in
 g.globalCompositeOperation='multiply';g.fillStyle='#8e93be';g.fillRect(0,0,STREET.w,STREET.h);
 g.globalCompositeOperation='lighter';
 for(const l of lights){const r=l.kind==='lamp'?150:l.kind==='window'?46:l.kind==='candle'?60:26,a=l.kind==='lamp'?.34:l.kind==='window'?.16:l.kind==='candle'?.22:.14;
  const gr=g.createRadialGradient(l.x,l.y+(l.kind==='lamp'?40:0),0,l.x,l.y+(l.kind==='lamp'?40:0),r);gr.addColorStop(0,`rgba(255,176,92,${a})`);gr.addColorStop(1,'rgba(255,150,70,0)');g.fillStyle=gr;g.fillRect(l.x-r,l.y-r+40,r*2,r*2);}
 g.globalCompositeOperation='source-over';
 // flames and bulbs stay bright after the grade
 for(const l of lights){if(l.kind==='window')continue;const r=l.kind==='lamp'?5:l.kind==='candle'?2.4:2.2;g.fillStyle='#fff2c0';g.beginPath();g.arc(l.x,l.y,r,0,7);g.fill();}
 if(weather==='rain'){
  // wet setts: a cool sheen and long warm reflections under the lamps
  g.globalCompositeOperation='multiply';g.fillStyle='#c4cce4';g.fillRect(0,0,STREET.w,STREET.h);g.globalCompositeOperation='lighter';
  for(const l of lights)if(l.kind==='lamp'){const gr=g.createLinearGradient(0,l.y+60,0,l.y+170);gr.addColorStop(0,'rgba(255,190,110,.22)');gr.addColorStop(1,'rgba(255,190,110,0)');g.fillStyle=gr;g.fillRect(l.x-7,l.y+60,14,110);}
  g.globalCompositeOperation='source-over';
 }
 return {canvas:c,scale:S,lights};
}

// the townsfolk: small chibi figures matching the guard's proportions, each on its own texture
export function paintFolk(f,S=2){
 const W=40,H=64,c=document.createElement('canvas');c.width=W*S;c.height=H*S;const g=c.getContext('2d');g.scale(S,S);
 const cx=W/2,foot=H-3;g.lineJoin='round';
 const ink=(fn,col,w=2.2)=>{fn();g.fillStyle=col;g.fill();g.lineWidth=w;g.strokeStyle=INK;g.stroke();};
 // legs and shoes
 for(const s of [-1,1])ink(()=>{g.beginPath();g.roundRect(cx+s*4-2.5,foot-12,5,12,2);},'#2a2230',1.6);
 // body: coat or skirt
 if(f.skirt)ink(()=>{g.beginPath();g.moveTo(cx-6,foot-26);g.lineTo(cx+6,foot-26);g.lineTo(cx+11,foot-8);g.quadraticCurveTo(cx,foot-5,cx-11,foot-8);g.closePath();},f.coat);
 else ink(()=>{g.beginPath();g.roundRect(cx-8,foot-27,16,18,5);},f.coat);
 g.fillStyle='rgba(255,255,255,.18)';g.fillRect(cx-6,foot-25,4,14);
 // arms; one holds a mug if asked
 ink(()=>{g.beginPath();g.ellipse(cx-9,foot-19,3,6,.3,0,7);},shadeHex(f.coat,.85),1.6);
 ink(()=>{g.beginPath();g.ellipse(cx+9,foot-19,3,6,-.3,0,7);},shadeHex(f.coat,.85),1.6);
 if(f.mug){ink(()=>{g.beginPath();g.roundRect(cx+8,foot-25,6,7,1.5);},'#c8a060',1.4);g.fillStyle='#fff6e0';g.fillRect(cx+8.6,foot-25.6,4.8,2);}
 // big head with hair, a face turned a little to one side
 ink(()=>{g.beginPath();g.ellipse(cx,foot-38,11,11.5,0,0,7);},'#f2d6bc');
 ink(()=>{g.beginPath();g.ellipse(cx-f.face*1.5,foot-43,12,8,0,Math.PI,0);g.lineTo(cx+11*f.face,foot-36);g.closePath();},f.hair,1.8);
 g.fillStyle=INK;g.beginPath();g.ellipse(cx+f.face*3-3,foot-36,1.4,2,0,0,7);g.ellipse(cx+f.face*3+3,foot-36,1.4,2,0,0,7);g.fill();
 g.fillStyle='rgba(230,120,120,.45)';g.beginPath();g.ellipse(cx+f.face*3-6,foot-32.5,2.4,1.4,0,0,7);g.ellipse(cx+f.face*3+6,foot-32.5,2.4,1.4,0,0,7);g.fill();
 if(f.hat)ink(()=>{g.beginPath();g.ellipse(cx,foot-47,14,4,0,0,7);g.moveTo(cx-8,foot-48);g.lineTo(cx-6,foot-58);g.lineTo(cx+7,foot-58);g.lineTo(cx+8,foot-48);},'#3a2e2a',1.8);
 return {canvas:c,ox:cx/W,oy:foot/H,S};
}

// trees for the square, painted with the same leaf clumps as the gate (they sway at runtime)
export const STREET_TREES=[{X:-.5,Y:8,h:150},{X:20.5,Y:12.5,h:170}];
