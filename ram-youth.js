// The white-ram youth as a pixel rig. Every frame is drawn pixel by pixel at the town's
// own scale (about 36 art px tall): front view (facing the traveller, south-west), back
// view (facing the gate, north-east) and a side view (mirrored for left/right). Poses are
// small parameter sets; the frame list in ACTS turns them into 10 fps animation.
import {clamp} from './journey.js';

const H=c=>{const n=parseInt(c.slice(1),16);return (255<<24|(n&255)<<16|(n>>8&255)<<8|n>>16)>>>0;};
export const C={
 out:H('#120d18'),
 // brown curls showing behind the mask
 hair0:H('#21140f'),hair1:H('#382419'),hair2:H('#523626'),hair3:H('#6f4c34'),
 skin0:H('#b8826f'),skin1:H('#dcae98'),skin2:H('#f2cfba'),skin3:H('#fbe4d4'),lip:H('#b46a68'),
 // the full ivory ram mask, gold-traced, with dark eye hollows
 mask0:H('#a8977b'),mask1:H('#d6c9ad'),mask2:H('#efe6d2'),mask3:H('#fcf8ee'),eye:H('#1a1014'),eyeHi:H('#7a2b2e'),
 gold0:H('#6e4a1c'),gold1:H('#a87a34'),gold2:H('#d8ab55'),gold3:H('#f3d690'),
 horn0:H('#6b4a22'),horn1:H('#a27536'),horn2:H('#cfa15a'),horn3:H('#ecca88'),
 // black velvet coat with gold embroidery; crimson cape lining
 coat0:H('#0e0b10'),coat1:H('#1a1519'),coat2:H('#2a2226'),coat3:H('#3d3236'),lining:H('#7d1f2e'),lining2:H('#a63441'),
 shirt0:H('#b4ab9c'),shirt1:H('#e2dacb'),shirt2:H('#faf5ea'),
 trou0:H('#0f0c10'),trou1:H('#1d181d'),trou2:H('#2c252b'),
 boot0:H('#0a080b'),boot1:H('#1c171d'),boot2:H('#3b3339'),
 // ivory gloves
 glove0:H('#b4a993'),glove1:H('#e5dcc8'),glove2:H('#faf5e9'),
 // the black invitation with a crimson seal
 paper0:H('#060508'),paper1:H('#18151c'),paper2:H('#2b2631'),seal0:H('#6e1822'),seal1:H('#b8343f')
};export const SPRITE_W=56,SPRITE_H=64,FOOT_X=28,FOOT_Y=60;     // origin = between the feet

class Canvas{
 constructor(){this.d=new Uint32Array(SPRITE_W*SPRITE_H);}
 p(x,y,c){x=Math.round(x)+FOOT_X;y=FOOT_Y-Math.round(y);if(x<0||y<0||x>=SPRITE_W||y>=SPRITE_H||!c)return;this.d[y*SPRITE_W+x]=c;}
 g(x,y){x=Math.round(x)+FOOT_X;y=FOOT_Y-Math.round(y);return x<0||y<0||x>=SPRITE_W||y>=SPRITE_H?0:this.d[y*SPRITE_W+x];}
 rect(x0,y0,x1,y1,c){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)this.p(x,y,c);}
 // filled polygon in sprite coords (y up); fn(x,y) gives the colour per pixel
 poly(pts,fn){const ys=pts.map(p=>p[1]),y0=Math.floor(Math.min(...ys)),y1=Math.ceil(Math.max(...ys));
  for(let y=y0;y<=y1;y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])/(b[1]-a[1])*(b[0]-a[0]));}
   xs.sort((a,b)=>a-b);for(let k=0;k+1<xs.length;k+=2)for(let x=Math.round(xs[k]);x<Math.round(xs[k+1]);x++)this.p(x,y,typeof fn==='function'?fn(x,y):fn);}}
 line(x0,y0,x1,y1,w,fn){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*2));for(let i=0;i<=n;i++){const t=i/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;for(let k=0;k<w;k++)for(let j=0;j<w;j++)this.p(x-(w-1)/2+k,y+(w-1)/2-j,typeof fn==='function'?fn(t,k,j):fn);}}
 outline(){const out=[];for(let y=0;y<SPRITE_H;y++)for(let x=0;x<SPRITE_W;x++){const i=y*SPRITE_W+x;if(this.d[i])continue;
  if((x>0&&this.d[i-1])||(x<SPRITE_W-1&&this.d[i+1])||(y>0&&this.d[i-SPRITE_W])||(y<SPRITE_H-1&&this.d[i+SPRITE_W]))out.push(i);}
  for(const i of out)this.d[i]=C.out;return this;}
}

// ---------- parts ----------
// The head is hand-placed pixel art (13×15, centre column 6, neck on the last row); the
// ram horns are pixel rings drawn behind it so the hair overlaps their roots.
// k outline · H/h/j/J hair · m/M/n/N mask light→shade · g gold · e eye · s/S/z skin · l lip
const HEAD={
 // full ram mask: broad brow, gold tracery down the forehead, eye hollows, long muzzle
 front:['....kHHHHk...','..kHjjHHHhk..','.kHjmmmmMnhk.','.kHmmmgMMnhk.','kHmmmmgMMMnhk','kHmeemmMeenhk',
  'kHmmmmmMMMnhk','.khmmmmMMnhk.','..kmmmmMMnk..','..kmmmMMMnk..','...kmmMMnk...','...kmMMMnk...','....knNnk....','....kSSSk....','...kSSSSSk...'],
 back:['...kkkkkkk...','..kHjjHHHhk..','.kHjJjHHHHhk.','.kjHHHjHHhhk.','kHjHHHHHHHhhk','kHHHjHHHHhhhk',
  'kHjHHHHHHhhhk','kHHHHhHHHhhhk','kHjHHHHHhhhhk','.kHHhHHhhhhk.','.khHhHhhhhhk.','..khHhhhhk...','...khhhhk....','....kSSSk....','...kSSSSSk...'],
 // three-quarter, facing right: the muzzle reaches forward
 side:['...kHHHHk....','..kHjjHHHk...','.kHjJmmmMk...','.kHjmmgMMnk..','kHHmmmgMMMnk.','kHHmmmmeeMnk.',
  'kHhmmmmMMMMnk','.khmmmmMMMMMk','..kmmmmMMMMnk','..kmmmMMMnnk.','...kmmMMnk...','...kmMMnk....','....knnk.....','....kSSk.....','...kSSSSk....']
};const HEAD_COL={k:C.out,H:C.hair1,h:C.hair0,j:C.hair2,J:C.hair3,m:C.mask3,M:C.mask2,n:C.mask1,N:C.mask0,g:C.gold2,e:C.eye,E:C.eyeHi,s:C.skin2,S:C.shirt2,z:C.skin0,l:C.lip};
function hornRing(cv,cx,cy,side,shade=0){
 // a ram's horn: rises from the crown, sweeps out and back, then curls down past the cheek
 // with its tip turning forward. Drawn as a tapering spiral with growth ridges.
 const s=side;
 for(let t=0;t<=1;t+=.02){
  const a=-Math.PI*.55+t*Math.PI*1.75,r=4.4-t*2.4,w=2.9-t*1.6;
  const px=cx+s*Math.cos(a)*r,py=cy+Math.sin(a)*r*.95;
  for(let k=-w/2;k<=w/2;k+=.5){const nx=px+s*Math.cos(a)*k,ny=py+Math.sin(a)*k*.95;
   const lit=-Math.sin(a)*.6-s*Math.cos(a)*.3-shade*.4+(k<0?.2:-.15),ridge=Math.floor(t*16)%2;
   cv.p(nx,ny,lit>.35?(ridge?C.horn3:C.horn2):lit>-.1?(ridge?C.horn2:C.horn1):lit>-.5?C.horn1:C.horn0);}
 }
}function head(cv,o){
 const {view,hx=0,hy=0,look=0,blink=false,mouth=0,side=1}=o,rows=HEAD[view],mir=view==='side'&&side<0;
 const top=40+Math.round(hy),left=Math.round(hx)-6,hy0=top-6;
 if(view==='side'){hornRing(cv,left+(mir?12.6:.2),hy0,mir?1:-1,.1);}
 else{hornRing(cv,left+.6,hy0+1,-1);hornRing(cv,left+12.4,hy0+1,1,.35);}
 for(let r=0;r<rows.length;r++){let row=rows[r];
  if(r===5&&view!=='back'){
   if(blink)row=row.replace(/ee/g,'nn');
   else if(look<0)row=row.replace('meem','emmn').replace('Meen','Mnee').replace('emmn','eemn');
  }
  if(mouth&&r===12)row=row.replace('SlS','llS');
  for(let c=0;c<row.length;c++){const ch=row[mir?row.length-1-c:c];if(ch==='.')continue;cv.p(left+c,top-r,HEAD_COL[ch]);}
 }
}// Long tailcoat: fitted at the waist, flaring to the knee, gold-edged; tails swing with the stride.
function coat(cv,o){
 const {view,bob=0,swing=0,side=1,breathe=0}=o,top=26+bob,sh=5.6+breathe*.3;
 if(view==='front'||view==='back'){
  const tl=-swing*1.1,tr=swing*1.1;
  // the cape behind: in front view we see its crimson lining between coat and boots,
  // from behind its black velvet with the lining turned up at the hem
  const cape=[[-sh-.6,top+.5],[sh+.6,top+.5],[8.4+tr*.7,5.2+Math.max(0,swing)],[3,4.4],[-3,4.4],[-8.4+tl*.7,5.2+Math.max(0,-swing)]];
  cv.poly(cape,(x,y)=>view==='front'?(Math.abs(x)>7.2||y<5.6?C.coat1:(x<0?C.lining2:C.lining)):(y<6.2?(x<0?C.lining2:C.lining):x<-3?C.coat3:x<3?C.coat2:C.coat1));
  const pts=[[-sh,top],[sh,top],[sh+.4,top-3],[4.6,top-8],[4,top-11],[5.6+tr*.5,8.6+Math.max(0,swing)],[6.4+tr,7],[1.6+tr*.3,7],[0,8.4],[-1.6+tl*.3,7],[-6.4+tl,7],[-5.6+tl*.5,8.6+Math.max(0,-swing)],[-4,top-11],[-4.6,top-8],[-sh-.4,top-3]];
  cv.poly(pts,(x,y)=>{const r=(x+7)/14;return x<-4?C.coat3:r<.44?C.coat2:r<.8?C.coat1:C.coat0;});
  if(view==='front'){
   // open front: white shirt and black cravat at the throat, a dark waistcoat with gold
   // buttons, gold edging down both fronts and round the flared hem
   cv.poly([[-1.6,top],[1.6,top],[2.2,top-6],[2,top-11],[0,top-12.4],[-2,top-11],[-2.2,top-6]],(x,y)=>y>top-3.4?C.shirt2:(x<0?C.coat2:C.coat1));
   for(let y=top-10;y<top-4;y+=2)cv.p(0,y,C.gold2);
   cv.p(0,top-1,C.coat0);cv.p(-1,top-1.4,C.coat0);cv.p(1,top-1.4,C.coat0);cv.p(0,top-2.4,C.gold3);cv.p(-1,top-.4,C.shirt1);
   const edge=(y,s)=>y>top-11?s*(1.6+(top-y)*.06):s*(.8+(top-11-y)*.12)+(s<0?tl:tr)*(y<12?.25:0);
   for(let y=8;y<top;y++){cv.p(edge(y,-1)-.5,y,y%3?C.gold2:C.gold3);cv.p(edge(y,1)+.5,y,C.gold1);}
   for(let x=-6;x<=6;x++){if(Math.abs(x)<1.4)continue;const s=x<0?-1:1;cv.p(x+(s<0?tl:tr),7.4+Math.max(0,s*swing)*(Math.abs(x)>4?1:.4)+(Math.abs(x)<3?.6:0),s<0?C.gold2:C.gold1);}
   // high standing collar framing the jaw; a gold chain across the left breast
   cv.poly([[-sh,top],[-1.6,top],[-2.4,top+3.4],[-4.6,top+2.6]],C.coat3);cv.poly([[sh,top],[1.6,top],[2.4,top+3.4],[4.6,top+2.6]],C.coat1);
   cv.p(-2.4,top+2.8,C.gold2);cv.p(2.4,top+2.8,C.gold1);
   for(const [x,y] of [[-4,top-4],[-3.4,top-5],[-2.6,top-5.6],[-1.8,top-5.2]])cv.p(x,y,C.gold2);cv.p(-4.2,top-5,C.gold3);
  }else{
   cv.poly([[-sh,top],[sh,top],[2.6,top+3],[-2.6,top+3]],C.coat1);
   for(let y=8;y<top-12;y++)cv.p(0,y,y%2?C.coat0:C.coat1);                                         // vent
   for(let y=top-11;y<top-5;y++){cv.p(-2.6,y,C.gold1);cv.p(2.6,y,C.gold0);}
   cv.p(-2.6,top-11,C.gold2);cv.p(2.6,top-11,C.gold1);
   for(let x=-6;x<=6;x++){const s=x<0?-1:1;cv.p(x+(s<0?tl:tr),7.4+Math.max(0,s*swing)*(Math.abs(x)>4?1:.4),C.gold1);}
  } }else{
  const s=side,tail=-swing*1.5;
  cv.poly([[-3.4*s,top],[3.2*s,top],[3.8*s,top-7],[3.6*s,top-12],[(4+tail*.2)*s,7.5],[(-4.6+tail)*s,6.8+Math.abs(swing)*.6],[-4*s,top-11],[-3.8*s,top-5]],(x,y)=>{const r=(x*s+4)/8;return r<.35?C.coat3:r<.7?C.coat2:C.coat1;});
  cv.poly([[1*s,top-.4],[3*s,top-.4],[3.6*s,top-7],[2*s,top-8]],(x,y)=>y>top-3?C.shirt2:C.coat3);
  for(let y=8;y<top-7;y++)cv.p(3.6*s,y,C.gold1);
  cv.poly([[-3.4*s,top],[0,top],[-.6*s,top+3.4],[-3*s,top+2.6]],C.coat2);
 }
}
function legs(cv,o){
 // stance or stride: phase in [0,1), feet lift on the passing step
 const {view,step=null,side=1,bob=0,spread=1}=o;
 const leg=(x,lift,fwd,c0,c1)=>{const fy=lift,fx=x+fwd;
  cv.rect(Math.round(fx)-1,Math.round(fy),Math.round(fx)+1,Math.round(fy)+2,C.boot1);cv.p(Math.round(fx)-1,Math.round(fy)+2,C.boot2);cv.p(Math.round(fx),Math.round(fy)+3,C.gold2);
  cv.line(x*.8,10+bob,fx,fy+3,3,(t,k)=>k===0?c1:c0);};
 if(view==='front'||view==='back'){
  if(step==null){leg(-2*spread,0,0,C.trou1,C.trou2);leg(2*spread,0,0,C.trou0,C.trou1);}
  else{const a=Math.sin(step*Math.PI*2),l1=Math.max(0,a)*2,l2=Math.max(0,-a)*2;leg(-2,l1,-a*.5,C.trou1,C.trou2);leg(2,l2,a*.5,C.trou0,C.trou1);}
 }else{
  const s=side;
  if(step==null){leg(-.6*s,0,0,C.trou0,C.trou1);leg(.8*s,0,0,C.trou1,C.trou2);}
  else{const a=Math.sin(step*Math.PI*2),b=Math.cos(step*Math.PI*2);
   const back=a<0?0:1;
   leg(0,Math.max(0,b)*1.6,a*3.4*s,back?C.trou0:C.trou1,back?C.trou1:C.trou2);
   leg(0,Math.max(0,-b)*1.6,-a*3.4*s,back?C.trou1:C.trou0,back?C.trou2:C.trou1);}
 }
}
// Two-bone arm toward a hand target (sprite coords). The elbow bends outward/down.
function arm(cv,sx,sy,hx,hy,o){
 const L1=5.4,L2=5.6,dx=hx-sx,dy=hy-sy,d=Math.min(L1+L2-.01,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);
 const k=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1))*(o.bend??1);
 const ex=sx+Math.cos(a-k)*L1,ey=sy+Math.sin(a-k)*L1,tx=sx+Math.cos(a)*d,ty=sy+Math.sin(a)*d;
 const col=o.lit?[C.coat3,C.coat2]:[C.coat2,C.coat1];
 cv.line(sx,sy,ex,ey,3,(t,kk)=>kk===0?col[0]:col[1]);cv.line(ex,ey,tx,ty,3,(t,kk)=>kk===0?col[0]:col[1]);
 cv.p(tx-(o.cuff??0),ty+.5,C.shirt2);                                         // shirt cuff
 if(o.palm){cv.rect(Math.round(tx)-1,Math.round(ty),Math.round(tx)+1,Math.round(ty)+3,C.glove1);cv.p(Math.round(tx)-1,Math.round(ty)+3,C.glove2);cv.p(Math.round(tx)+1,Math.round(ty)+3,C.glove2);cv.p(Math.round(tx)-2,Math.round(ty)+1,C.glove1);}
 else{cv.rect(Math.round(tx)-1,Math.round(ty)-1,Math.round(tx),Math.round(ty),C.glove1);cv.p(Math.round(tx)-1,Math.round(ty),C.glove2);}
 return [tx,ty];
}
function letter(cv,x,y,tilt=0){
 for(let j=0;j<4;j++)for(let i=0;i<6;i++){const xx=x-3+i,yy=y-2+j+(tilt&&i>2?-1:0);cv.p(xx,yy,j===0?C.paper0:i<2?C.paper2:C.paper1);}
 cv.p(x,y-.4,C.seal1);cv.p(x+1,y-.4,C.seal0);cv.p(x-2,y+1,C.paper0);cv.p(x+2,y+1,C.paper0);
}

// ---------- pose → frame ----------
export function drawYouth(o){
 const cv=new Canvas(),view=o.view,s=o.side??1,bob=o.bob??0,br=o.breathe??0;
 const shY=25+bob,shL=[-5.8,shY],shR=[5.8,shY];
 const handIdle=[[-6.4,14.8+bob],[6.4,14.8+bob]];
 const L=o.handL??handIdle[0],R=o.handR??handIdle[1];
 if(view==='front'){
  // far-side arm (right hand, viewer's right) behind the coat only when it hangs
  legs(cv,o);coat(cv,o);
  const lh=arm(cv,shL[0],shL[1],L[0],L[1],{lit:true,palm:o.palmL,bend:o.bendL??1,cuff:-.5});
  const rh=arm(cv,shR[0],shR[1],R[0],R[1],{palm:o.palmR,bend:-(o.bendR??1),cuff:.5});
  head(cv,{view,hx:o.headX??0,hy:bob+(o.nod??0),look:o.look,blink:o.blink,tilt:o.tilt,mouth:o.mouth});
  if(o.letter==='R')letter(cv,rh[0]+1.5,rh[1]+1.2);
  if(o.letter==='L')letter(cv,lh[0]-1.5,lh[1]+1.2);
 }else if(view==='back'){
  const lh=arm(cv,shL[0],shL[1],L[0],L[1],{palm:o.palmL,bend:o.bendL??1,lit:true});
  const rh=arm(cv,shR[0],shR[1],R[0],R[1],{palm:o.palmR,bend:-(o.bendR??1)});
  legs(cv,o);coat(cv,o);
  head(cv,{view,hx:o.headX??0,hy:bob});
 }else{
  const far=[s*-1.2,shY],near=[s*1.4,shY];
  arm(cv,far[0],far[1],(o.handFar??[s*-1+(o.swingArm??0)*-s*2,14.6+bob])[0],(o.handFar??[0,14.6+bob])[1],{});
  legs(cv,o);coat(cv,{...o,side:s});
  arm(cv,near[0],near[1],(o.handNear??[s*1.6+(o.swingArm??0)*s*2.4,14.4+bob])[0],(o.handNear??[0,14.4+bob])[1],{lit:true,palm:o.palmNear,bend:s});
  head(cv,{view,hx:s*.4,hy:bob,blink:o.blink,side:s,mouth:o.mouth});
 }
 return cv.outline();
}

// ---------- acts ----------
// Each act is a list of frames at 10 fps. Helper easing keeps hand paths smooth.
const ease=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t,lp=(A,B,t)=>[lerp(A[0],B[0],t),lerp(A[1],B[1],t)];
const breath=i=>Math.round(Math.sin(i/10*Math.PI*2/3.2)*.5+.5)?0:0;
export const HAND={idleL:[-6.4,14.8],idleR:[6.4,14.8],chest:[1.6,20],coatIn:[2.4,19.6],out:[4,20.6],reach:[10,22.5],give:[11.4,23.4]};
export function act(name,i){
 // returns a pose for frame i of the act (clamped), plus .end when the act is finished
 const f=i;
 switch(name){
  case 'idle':{                          // weight shifts every ~3 s, blink every ~4 s, small breathe
   const t=f%40,b=(Math.floor(f/14)%3===0)?-1:0,blink=(f%38)===0||(f%38)===1;
   return {view:'front',bob:t<20?0:0,breathe:t<20?0:1,blink,look:0,handL:[-6.4,14.8+(t<20?0:-.4)],handR:[6.4,14.8]};
  }
  case 'notice':{                        // glance down the road, then settle the gaze on the traveller
   const look=f<4?-1:f<8?0:0,nod=f>=8&&f<11?-.6:0;return {view:'front',look,nod,blink:f===6,end:f>=14};
  }
  case 'offer':{                         // into the coat, draw the letter, lift and hold it out
   const k=[
    [HAND.idleR,0,null],[lp(HAND.idleR,HAND.coatIn,.4),0,null],[HAND.coatIn,0,null],[HAND.coatIn,0,'R'],[lp(HAND.coatIn,HAND.out,.5),0,'R'],
    [HAND.out,0,'R'],[lp(HAND.out,HAND.reach,.45),0,'R'],[lp(HAND.out,HAND.reach,.8),0,'R'],[HAND.reach,0,'R'],[HAND.give,1,'R'],[HAND.give,1,'R'],[HAND.give,1,'R']
   ],e=k[Math.min(f,k.length-1)];
   return {view:'front',handR:[e[0][0],e[0][1]],letter:e[2],mouth:e[1],nod:f>=9?-.4:0,bendR:f<3?1:.6,end:f>=k.length-1};
  }
  case 'hold':{                          // letter held out, waiting for the traveller to take it
   return {view:'front',handR:[...HAND.give],letter:'R',blink:f%36===0,end:false};
  }
  case 'release':{                       // let go, withdraw the hand
   const t=ease(Math.min(1,f/6));return {view:'front',handR:lp(HAND.give,HAND.idleR,t),letter:null,end:f>=7};
  }
  case 'wait':{                          // hands clasped behind, attentive, occasional blink
   return {view:'front',handL:[-3.2,16.6],handR:[3.2,16.6],blink:f%42===0||f%42===1,look:f%60>45?1:0,end:false};
  }
  case 'deny':{                          // raise an open palm: not yet
   const k=[0,.3,.65,.9,1,1,1,1,1,1,1,.8,.5,.2,0],t=k[Math.min(f,k.length-1)];
   return {view:'front',handL:lp(HAND.idleL,[-10.6,25],ease(t)),palmL:t>.5,bendL:.4,nod:t>.9&&f<9?.4:0,mouth:t>.9?1:0,end:f>=k.length-1};
  }
  case 'puzzle':{                        // network trouble: he glances aside, unsure the message arrived
   const look=f<5?1:f<10?-1:0;return {view:'front',look,tilt:f<10?1:0,end:f>=14};
  }
  case 'bow':{                           // accepts: a short nod of welcome
   const k=[0,.5,1,1,.6,.2,0],t=k[Math.min(f,k.length-1)];return {view:'front',nod:-t*1.4,headX:0,handR:lp(HAND.idleR,[2,19],t),end:f>=k.length-1};
  }
  case 'walkBack':{                      // turn to the gate and climb the steps (back view)
   const phase=(f%8)/8,bob=[0,-.5,-1,-.5,0,-.5,-1,-.5][f%8]*.5;return {view:'back',step:phase,bob,swing:Math.sin(phase*Math.PI*2),handL:[-6.4+Math.sin(phase*Math.PI*2)*1.2,14.8],handR:[6.4-Math.sin(phase*Math.PI*2)*1.2,14.8]};
  }
  case 'walkFront':{                     // walking toward the traveller (front view)
   const phase=(f%8)/8,bob=[0,-.5,-1,-.5,0,-.5,-1,-.5][f%8]*.5;return {view:'front',step:phase,bob,swing:Math.sin(phase*Math.PI*2),handL:[-6.4-Math.sin(phase*Math.PI*2)*1.2,14.8],handR:[6.4+Math.sin(phase*Math.PI*2)*1.2,14.8]};
  }
  case 'standBack':return {view:'back',end:f>=2};
  case 'reachDoor':{                     // lift both hands to shoulder height, toward the leaves
   const t=ease(Math.min(1,f/6));return {view:'back',handL:lp(HAND.idleL,[-7.6,22],t),handR:lp(HAND.idleR,[8.6,24],t),palmL:true,palmR:true,bendL:.5,bendR:.5,end:f>=7};
  }
  case 'push':{                          // lean into the leaves; hands are re-aimed each frame
   const phase=(f%8)/8;return {view:'back',palmL:true,palmR:true,bendL:.4,bendR:.4,bob:-.6,step:f%16<8?null:phase,lean:1};
  }
  case 'walkSide':{                      // step aside, side view
   const phase=(f%8)/8,bob=[0,-.5,-1,-.5,0,-.5,-1,-.5][f%8]*.5;return {view:'side',step:phase,bob,swing:Math.sin(phase*Math.PI*2)*.7,swingArm:Math.sin(phase*Math.PI*2)};
  }
  case 'welcome':{                       // face the traveller, an open-handed gesture toward the gate
   const t=ease(Math.min(1,f/6));return {view:'front',handL:lp(HAND.idleL,[-11,20],t),palmL:t>.6,bendL:.5,look:t>.5?-1:0,nod:t>.8?-.5:0,end:f>=10};
  }
 }
 return {view:'front'};
}
