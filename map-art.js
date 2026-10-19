// Seventh pass: an old survey map with no edge. The world is a stable function of map
// coordinates, painted on demand into 512-unit chunks; the traveller walks ever to the
// right, turning up and down through valleys, and new country is drawn ahead of him.
// Chunks are painted in slices (a generator) and kept in a small LRU cache, so memory stays
// bounded however long the journey runs. Every feature is placed and jittered from hashes
// of its own coordinates, so a feature that straddles two chunks is drawn identically in
// both and the seam disappears.
import {clamp,smooth} from './journey.js';

export const CHUNK=512,BLEED=3;
const INK='#3d3125',INK_SOFT='rgba(61,49,37,.55)',PENCIL='rgba(92,78,58,.55)';

// ---------- stable noise ----------
const hash=(x,y,s=0)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^h>>>13,1274126177);return ((h^h>>>16)>>>0)/4294967296;};
const vn1=(x,s)=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=hash(i,7,s);return a+(hash(i+1,7,s)-a)*u;};
const vn2=(x,y,s)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
const fbm2=(x,y,s,o=4)=>{let t=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){t+=a*vn2(x*f,y*f,s+i*31);n+=a;f*=2.03;a*=.5;}return t/n;};

// ---------- names ----------
const HEADS=['Ash','Bram','Cor','Dun','Elder','Fen','Glen','Hart','Iver','Kel','Lang','Mar','North','Oak','Pen','Quen','Rose','Stan','Thorn','Ul','Wyn','Yar','Brook','Elm','Fair','High','Holly','Lark','Mill','Moss','Stone','Willow','Wood','Bel','Cal','Dor','Even','Gold','Hazel','Kings','Ley','Mere','Nether','Oster','Red','Sal','Tam','Wester','Briar','Cran','Ember','Fox','Hollow'];
const TAILS=['ford','wick','mere','haven','bury','field','stead','dale','brook','ton','by','holm','ley','gate','well','croft','cott','minster','combe','thorpe','hurst','mouth',' Cross',' Green',' End',' Abbey',' Vale'];
const FORBIDDEN=/raven|crow|bluff|rook/i;
export function townName(id){
 for(let k=0;k<6;k++){const a=HEADS[Math.floor(hash(id,k,51)*HEADS.length)],b=TAILS[Math.floor(hash(id,k,52)*TAILS.length)];
  const n=(a+b).replace(/(.)\1\1/g,'$1$1');if(!FORBIDDEN.test(n))return n;}
 return 'Millbrook';
}
const RIVER_NAMES=['River Aldwyn','River Severn','River Lune','River Tamar','River Wend','River Cray','River Isel','River Mole'];

// ---------- the world ----------
export function createWorld(seed=1){
 const S=seed%100000;
 // The road: always heading east, bending north and south through the country.
 const routeY=x=>380*(vn1(x/1500,S+1)-.5)*2+150*(vn1(x/560,S+2)-.5)*2+40*(vn1(x/180,S+3)-.5)*2;
 // Rivers run roughly north–south across the road; k-th river centre near x=900+1700k.
 const riverBase=k=>900+k*1700+(hash(k,0,S+5)-.5)*600;
 const riverX=(k,y)=>riverBase(k)+190*(vn1(y/520+k*7.3,S+6)-.5)*2+46*Math.sin(y/130+k*2.1);
 const nearestRiver=x=>Math.round((x-900)/1700);
 const riverDist=(x,y)=>{const k=nearestRiver(x);let d=1e9;for(let j=k-1;j<=k+1;j++)d=Math.min(d,Math.abs(x-riverX(j,y)));return d;};
 // where the road crosses each river (for bridges): bisection on x−riverX(routeY(x))
 const crossings=new Map();
 const crossing=k=>{if(crossings.has(k))return crossings.get(k);let a=riverBase(k)-520,b=riverBase(k)+520;const f=x=>x-riverX(k,routeY(x));
  for(let i=0;i<40;i++){const m=(a+b)/2;if(f(a)*f(m)<=0)b=m;else a=m;}const x=(a+b)/2,c={x,y:routeY(x),k};crossings.set(k,c);return c;};
 // Towns on the road, spaced unevenly; nudged off river crossings.
 const routeTowns=[];
 const routeTown=i=>{while(routeTowns.length<=i){const j=routeTowns.length;let x=j?routeTowns[j-1].x+380+hash(j,1,S+7)*320:160;
   const c=crossing(nearestRiver(x));if(Math.abs(x-c.x)<130)x=c.x+(x<c.x?-140:140);
   routeTowns.push({id:100000+j,x,y:routeY(x),size:hash(j,2,S+8)<.28?3:hash(j,3,S+8)<.5?2:1,route:true,name:townName(S*7+j)});}
  return routeTowns[i];};
 const routeTownsIn=(x0,x1)=>{const out=[];for(let i=0;;i++){const t=routeTown(i);if(t.x>x1)break;if(t.x>=x0)out.push(t);}return out;};
 // Towns off the road on a jittered grid, where the land allows.
 const CELL=300,offCache=new Map();
 const offTown=(i,j)=>{const key=i+','+j;if(offCache.has(key))return offCache.get(key);let t=null;
  if(hash(i,j,S+11)<.5){const x=(i+.18+.64*hash(i,j,S+12))*CELL,y=(j+.18+.64*hash(i,j,S+13))*CELL;
   const near=routeTownsIn(x-230,x+230).some(r=>Math.abs(r.y-y)<190);
   if(Math.abs(y-routeY(x))>150&&!near&&riverDist(x,y)>70&&mountain(x,y)<.6)t={id:i*4099+j*131,x,y,size:hash(i,j,S+14)<.18?3:hash(i,j,S+15)<.45?2:1,route:false,name:townName(S*13+i*977+j*31+5000)};}
  if(offCache.size>4000)offCache.clear();offCache.set(key,t);return t;};
 const townsIn=(x0,y0,x1,y1)=>{const out=routeTownsIn(x0,x1).filter(t=>t.y>=y0&&t.y<=y1);
  for(let i=Math.floor(x0/CELL);i<=Math.floor(x1/CELL);i++)for(let j=Math.floor(y0/CELL);j<=Math.floor(y1/CELL);j++){const t=offTown(i,j);if(t&&t.x>=x0&&t.x<=x1&&t.y>=y0&&t.y<=y1)out.push(t);}
  return out;};
 const mountain=(x,y)=>fbm2(x/820,y/820,S+21);
 const forest=(x,y)=>fbm2(x/480+40,y/480,S+31);

 // ---------- the walker's path, measured by distance ----------
 const START_X=-140,STEP=4;let xs=[START_X],ys=[routeY(START_X)],ss=[0],base=0;
 const extend=s=>{while(ss[ss.length-1]<s){const x=xs[xs.length-1]+STEP,y=routeY(x);ss.push(ss[ss.length-1]+Math.hypot(STEP,y-ys[ys.length-1]));xs.push(x);ys.push(y);}
  // keep a bounded window of samples behind the walker
  if(ss.length>6000){const cut=ss.length-3000;xs=xs.slice(cut);ys=ys.slice(cut);ss=ss.slice(cut);}};
 const atDistance=s=>{extend(s+8);let lo=0,hi=ss.length-1;if(s<=ss[0])return {x:xs[0],y:ys[0],angle:0};
  while(hi-lo>1){const m=lo+hi>>1;if(ss[m]<s)lo=m;else hi=m;}const t=(s-ss[lo])/(ss[hi]-ss[lo]||1);
  return {x:xs[lo]+(xs[hi]-xs[lo])*t,y:ys[lo]+(ys[hi]-ys[lo])*t,angle:Math.atan2(ys[hi]-ys[lo],xs[hi]-xs[lo])};};

 return {seed:S,routeY,riverX,riverDist,crossing,nearestRiver,townsIn,routeTownsIn,mountain,forest,atDistance};
}

// ---------- pen ----------
function wob(ctx,pts,seed,{w=1,col=INK,alpha=1,jit=.7,close=false}={}){
 ctx.globalAlpha=alpha;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();
 for(let i=0;i<pts.length;i++){const [x,y]=pts[i],ox=(hash(i,seed,1)-.5)*jit,oy=(hash(i,seed,2)-.5)*jit;i?ctx.lineTo(x+ox,y+oy):ctx.moveTo(x+ox,y+oy);}
 if(close)ctx.closePath();ctx.stroke();ctx.globalAlpha=1;
}
const line=(ctx,x0,y0,x1,y1,seed,o)=>wob(ctx,[[x0,y0],[(x0+x1)/2+(hash(seed,3,4)-.5)*.8,(y0+y1)/2+(hash(seed,5,6)-.5)*.8],[x1,y1]],seed,o);
function hatch(ctx,path,gap,angle,col,w=.5){
 ctx.save();ctx.clip(path);const b=path.bounds,c=Math.cos(angle),s=Math.sin(angle),R=Math.hypot(b.w,b.h);
 ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();
 for(let d=-R;d<=R;d+=gap){const cx=b.x+b.w/2+c*0,cy=b.y+b.h/2;ctx.moveTo(cx-s*d-c*R,cy+c*d-s*R);ctx.lineTo(cx-s*d+c*R,cy+c*d+s*R);}
 ctx.stroke();ctx.restore();
}
function poly(pts){const p=new Path2D();pts.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);p.bounds={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};return p;}

// ---------- paper ----------
const PAPER='#d2b98c';
function* paperLayer(ctx,X0,Y0,S){
 const C=CHUNK;ctx.fillStyle=PAPER;ctx.fillRect(X0-BLEED,Y0-BLEED,C+2*BLEED,C+2*BLEED);
 // broad oxidation, then mid tones: radial washes centred on world cells (incl. neighbours)
 const wash=(cell,rMin,rMax,alpha,seed)=>{for(let i=Math.floor(X0/cell)-1;i<=Math.floor((X0+C)/cell)+1;i++)for(let j=Math.floor(Y0/cell)-1;j<=Math.floor((Y0+C)/cell)+1;j++){
  const x=(i+hash(i,j,seed))*cell,y=(j+hash(i,j,seed+1))*cell,r=rMin+(rMax-rMin)*hash(i,j,seed+2),dark=hash(i,j,seed+3)<.58,a=alpha*(.5+hash(i,j,seed+4));
  const g=ctx.createRadialGradient(x,y,r*.1,x,y,r);g.addColorStop(0,dark?`rgba(128,84,38,${a})`:`rgba(246,232,200,${a})`);g.addColorStop(1,dark?'rgba(128,84,38,0)':'rgba(246,232,200,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}};
 wash(900,420,900,.22,S+60);wash(260,90,260,.11,S+70);wash(120,40,110,.07,S+75);yield;
 // water stains: a pale tide-marked ring with a darker rim
 for(let i=Math.floor(X0/800)-1;i<=Math.floor((X0+C)/800)+1;i++)for(let j=Math.floor(Y0/800)-1;j<=Math.floor((Y0+C)/800)+1;j++){
  if(hash(i,j,S+80)>.38)continue;const cx=(i+hash(i,j,S+81))*800,cy=(j+hash(i,j,S+82))*800,r=70+hash(i,j,S+83)*110,pts=[];
  for(let k=0;k<40;k++){const a=k/40*Math.PI*2,rr=r*(.82+.3*vn1(k/5+i*3,S+84));pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.86]);}
  const p=poly(pts);ctx.fillStyle='rgba(150,108,58,.06)';ctx.fill(p);ctx.strokeStyle='rgba(120,80,40,.2)';ctx.lineWidth=2.2;ctx.stroke(p);
  ctx.strokeStyle='rgba(120,80,40,.08)';ctx.lineWidth=1;ctx.save();ctx.translate(cx,cy);ctx.scale(.86,.86);ctx.translate(-cx,-cy);ctx.stroke(p);ctx.restore();}
 // foxing and scuffs
 for(let i=Math.floor(X0/90);i<=Math.floor((X0+C)/90);i++)for(let j=Math.floor(Y0/90);j<=Math.floor((Y0+C)/90);j++){
  const h=hash(i,j,S+90);if(h<.16){const n=2+Math.floor(hash(i,j,S+91)*6);for(let k=0;k<n;k++){ctx.fillStyle=`rgba(118,70,30,${.1+hash(i,k,S+92)*.2})`;ctx.beginPath();ctx.arc((i+hash(k,j,S+93))*90,(j+hash(k,i,S+94))*90,.6+hash(k,k+i,S+95)*1.8,0,7);ctx.fill();}}
  else if(h>.94){const x=(i+.5)*90,y=(j+.5)*90;ctx.strokeStyle='rgba(250,240,214,.35)';ctx.lineWidth=.6;ctx.beginPath();for(let k=0;k<7;k++){const yy=y+k*1.6;ctx.moveTo(x-14,yy);ctx.lineTo(x+14+hash(k,i,4)*6,yy-3);}ctx.stroke();}}
 yield;
 // fibres and grain (local to the chunk: too fine to show a seam)
 const r=k=>hash(k,Math.floor(X0),Math.floor(Y0)+S);
 ctx.lineWidth=.45;for(let k=0;k<1400;k++){const x=X0+r(k*3)*C,y=Y0+r(k*3+1)*C,l=3+r(k*3+2)*12,a=(r(k+7)-.5)*.7;
  ctx.strokeStyle=k%3?'rgba(100,72,40,.11)':'rgba(255,246,220,.22)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);ctx.stroke();}
 for(let k=0;k<5000;k++){ctx.fillStyle=k%2?'rgba(90,60,30,.06)':'rgba(255,250,232,.12)';ctx.fillRect(X0+r(k+9000)*C,Y0+r(k+19000)*C,1,1);}
 yield;
 // creases of a map folded many times: vertical every 1150, horizontal every 900
 for(let k=Math.floor(X0/1150);k<=Math.floor((X0+C)/1150)+1;k++){const x=k*1150+300;if(x<X0-30||x>X0+C+30)continue;
  const g=ctx.createLinearGradient(x-22,0,x+22,0);g.addColorStop(0,'rgba(80,55,28,0)');g.addColorStop(.45,'rgba(80,55,28,.13)');g.addColorStop(.52,'rgba(255,244,214,.3)');g.addColorStop(1,'rgba(255,244,214,0)');
  ctx.fillStyle=g;ctx.fillRect(x-22,Y0,44,C);ctx.strokeStyle='rgba(70,48,24,.16)';ctx.lineWidth=.7;wob(ctx,Array.from({length:22},(_,i)=>[x+(vn1((Y0+i*C/21)/60,k)-.5)*1.4,Y0+i*C/21]),k*7,{col:'rgba(70,48,24,.16)',w:.7,jit:.4});}
 for(let k=Math.floor(Y0/900);k<=Math.floor((Y0+C)/900)+1;k++){const y=k*900+450;if(y<Y0-30||y>Y0+C+30)continue;
  const g=ctx.createLinearGradient(0,y-18,0,y+18);g.addColorStop(0,'rgba(80,55,28,0)');g.addColorStop(.45,'rgba(80,55,28,.11)');g.addColorStop(.55,'rgba(255,244,214,.26)');g.addColorStop(1,'rgba(255,244,214,0)');
  ctx.fillStyle=g;ctx.fillRect(X0,y-18,C,36);}
 // worn spots where creases cross
 for(let k=Math.floor(X0/1150);k<=Math.floor((X0+C)/1150)+1;k++)for(let j=Math.floor(Y0/900);j<=Math.floor((Y0+C)/900)+1;j++){const x=k*1150+300,y=j*900+450,g=ctx.createRadialGradient(x,y,2,x,y,46);
  g.addColorStop(0,'rgba(250,238,206,.45)');g.addColorStop(.6,'rgba(160,120,70,.08)');g.addColorStop(1,'rgba(160,120,70,0)');ctx.fillStyle=g;ctx.fillRect(x-46,y-46,92,92);}
}

// ---------- features ----------
function drawRiver(ctx,W,k,Y0,Y1,S){
 const pts=[];for(let y=Y0-40;y<=Y1+40;y+=10)pts.push([W.riverX(k,y),y]);
 const off=(d)=>pts.map(([x,y],i)=>{const n=pts[Math.min(i+1,pts.length-1)],p=pts[Math.max(i-1,0)],dx=n[0]-p[0],dy=n[1]-p[1],l=Math.hypot(dx,dy)||1;const w=d*(1+.25*vn1(y/90,k+S));return [x-dy/l*w,y+dx/l*w];});
 const L=off(-6),R=off(6),band=poly([...L,...R.reverse()]);
 ctx.fillStyle='rgba(222,208,176,.85)';ctx.fill(band);
 ctx.save();ctx.clip(band);ctx.strokeStyle='rgba(80,70,55,.28)';ctx.lineWidth=.5;
 for(let i=0;i<pts.length-1;i+=2){const [x,y]=pts[i];ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y+5);ctx.stroke();}ctx.restore();
 wob(ctx,L,k*31+1,{w:1.1,col:INK,alpha:.75,jit:.6});wob(ctx,off(6),k*31+2,{w:.9,col:INK,alpha:.7,jit:.6});
 wob(ctx,off(-9),k*31+3,{w:.5,col:PENCIL,alpha:.6});wob(ctx,off(9),k*31+4,{w:.5,col:PENCIL,alpha:.6});
}
function drawPeak(ctx,rctx,m){
 const {x,y,h,w,id}=m,lean=(hash(id,1,2)-.5)*w*.25,top=[x+lean,y-h],L=[x-w,y],R=[x+w*.92,y];
 const left=t=>[L[0]+(top[0]-L[0])*t+Math.sin(t*Math.PI)*w*.05,L[1]+(top[1]-L[1])*t-Math.sin(t*Math.PI)*h*.08+Math.sin(t*9+id)*h*.015];
 const right=t=>[top[0]+(R[0]-top[0])*t+Math.sin(t*Math.PI)*w*.06,top[1]+(R[1]-top[1])*t-Math.sin(t*Math.PI)*h*.1+Math.sin(t*11+id)*h*.015];
 const pts=[];for(let t=0;t<=1.001;t+=.05)pts.push(left(t));for(let t=.05;t<=1.001;t+=.05)pts.push(right(t));
 const p=poly(pts);rctx.globalCompositeOperation='destination-out';rctx.fill(p);rctx.globalCompositeOperation='source-over';
 rctx.fillStyle='rgba(214,191,149,.55)';rctx.fill(p);
 rctx.strokeStyle=INK;rctx.globalAlpha=.85;rctx.lineWidth=1;rctx.beginPath();pts.forEach(([a,b],i)=>i?rctx.lineTo(a,b):rctx.moveTo(a,b));rctx.stroke();
 const spine=t=>[top[0]+(x+w*.12-top[0])*t+Math.sin(t*5+id)*w*.03,top[1]+(y-top[1])*t];
 rctx.lineWidth=.5;rctx.globalAlpha=.7;rctx.beginPath();for(let t=.05;t<.97;t+=Math.max(.035,2.4/h)){const a=spine(t),b=right(t);rctx.moveTo(a[0]+1,a[1]);rctx.lineTo(b[0]-1,b[1]+.6);}rctx.stroke();
 rctx.lineWidth=.45;rctx.globalAlpha=.5;rctx.beginPath();for(let k=0;k<2+h/30;k++){const t=.3+hash(id,k,3)*.5,a=left(t);rctx.moveTo(...a);rctx.lineTo(a[0]+w*.12,a[1]+h*.2);}rctx.moveTo(L[0]-4,y+2);rctx.lineTo(R[0]+6,y+1.5);rctx.stroke();rctx.globalAlpha=1;
}
function drawHill(rctx,m){
 const {x,y,w,h}=m,p=new Path2D();p.moveTo(x-w,y);p.bezierCurveTo(x-w*.5,y-h*1.25,x+w*.35,y-h*1.3,x+w,y);p.closePath();
 rctx.globalCompositeOperation='destination-out';rctx.fill(p);rctx.globalCompositeOperation='source-over';
 rctx.strokeStyle=INK;rctx.globalAlpha=.6;rctx.lineWidth=.8;rctx.beginPath();rctx.moveTo(x-w,y);rctx.bezierCurveTo(x-w*.5,y-h*1.25,x+w*.35,y-h*1.3,x+w,y);rctx.stroke();
 rctx.lineWidth=.45;rctx.beginPath();for(let k=0;k<5;k++){const t=.55+k*.09,px=x-w+2*w*t,py=y-h*(1-((t-.45)/.55)**2)*.95;rctx.moveTo(px,py+1.5);rctx.lineTo(px-w*.08,y-1);}rctx.stroke();rctx.globalAlpha=1;
}
function drawTree(ctx,x,y,h,id){
 const kind=hash(id,0,9);ctx.strokeStyle=INK;ctx.globalAlpha=.78;ctx.lineWidth=.7;
 if(kind<.45){const pts=[[x-h*.26,y-3],[x-h*.12,y-h*.38],[x-h*.2,y-h*.37],[x,y-h],[x+h*.22,y-h*.37],[x+h*.13,y-h*.37],[x+h*.28,y-3]];wob(ctx,pts,id,{w:.7,alpha:.8,jit:.5});
  ctx.globalAlpha=.55;ctx.beginPath();for(let j=1;j<4;j++){ctx.moveTo(x+1,y-h*.2*j);ctx.lineTo(x+h*.15,y-h*.2*j+3);}ctx.stroke();}
 else{const r=h*.36,cy=y-h*.62;ctx.beginPath();for(let k=0;k<=12;k++){const a=k/12*Math.PI*2,rr=r*(.85+.25*hash(id,k,3));k?ctx.lineTo(x+Math.cos(a)*rr,cy+Math.sin(a)*rr*.9):ctx.moveTo(x+Math.cos(a)*rr,cy+Math.sin(a)*rr*.9);}ctx.stroke();
  ctx.globalAlpha=.5;ctx.lineWidth=.5;ctx.beginPath();for(let k=0;k<4;k++){const yy=cy-r*.2+k*r*.25;ctx.moveTo(x+r*.1,yy);ctx.lineTo(x+r*.8,yy+2);}ctx.stroke();}
 ctx.globalAlpha=.8;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y-h*.35);ctx.lineTo(x,y+2);ctx.stroke();
 ctx.globalAlpha=.4;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+9,y+3);ctx.stroke();ctx.globalAlpha=1;
}
function drawHouse(ctx,x,y,w,h,id){
 const side=w*.38,roof=h*.45;
 const front=poly([[x,y],[x+w,y-2],[x+w,y-h],[x+w*.5,y-h-roof],[x,y-h]]),sidep=poly([[x+w,y-2],[x+w+side,y-8],[x+w+side,y-h-6],[x+w,y-h]]),roofp=poly([[x-2,y-h],[x+w*.5,y-h-roof],[x+w+side*.6,y-h-roof-4],[x+w+side+2,y-h-6],[x+w,y-h]]);
 ctx.fillStyle='rgba(234,218,184,.95)';ctx.fill(front);ctx.fill(sidep);ctx.fill(roofp);
 hatch(ctx,sidep,2.8,1.1,'rgba(61,49,37,.55)',.45);hatch(ctx,roofp,2.4,-.5,'rgba(61,49,37,.6)',.5);
 ctx.strokeStyle=INK;ctx.lineWidth=.8;ctx.globalAlpha=.85;ctx.stroke(front);ctx.stroke(sidep);ctx.stroke(roofp);
 ctx.lineWidth=.6;ctx.strokeRect(x+w*.4,y-h*.42,w*.22,h*.4);if(w>16)ctx.strokeRect(x+3,y-h+5,3.4,4.6);
 if(id%2===0){ctx.beginPath();ctx.moveTo(x+2,y-h*.62);ctx.lineTo(x+w-2,y-4);ctx.moveTo(x+w-2,y-h*.62);ctx.lineTo(x+2,y-4);ctx.globalAlpha=.4;ctx.stroke();}
 ctx.globalAlpha=.85;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x+w*.24,y-h-roof*.45);ctx.lineTo(x+w*.24,y-h-roof*.8-3);ctx.stroke();ctx.globalAlpha=1;
}
function drawTown(ctx,t){
 const n=3+t.size*4,houses=[],ang=hash(t.id,4,5)*Math.PI,style=t.size===3?'ring':hash(t.id,5,6)<.5?'street':'cluster';
 for(let j=0;j<n;j++){let hx,hy;
  if(style==='street'){const along=(j-n/2)*13+(hash(t.id,j,7)-.5)*5,side=j%2?1:-1;hx=t.x+Math.cos(ang)*along-Math.sin(ang)*side*8;hy=t.y-18+Math.sin(ang)*along*.45+Math.cos(ang)*side*4;}
  else{const a=j*2.399+hash(t.id,0,8),rad=Math.sqrt((j+.5)/n)*(24+t.size*10);hx=t.x+Math.cos(a)*rad;hy=t.y-18+Math.sin(a)*rad*.45;}
  houses.push({x:hx-10,y:hy,w:12+hash(t.id,j,9)*9,h:16+hash(t.id,j,10)*11,id:t.id+j});}
 if(style==='ring'){const cx=t.x-2,cy=t.y-24,rx=60,ry=28;ctx.strokeStyle=INK;ctx.globalAlpha=.7;ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,7);ctx.stroke();ctx.globalAlpha=.4;ctx.lineWidth=.5;ctx.beginPath();ctx.ellipse(cx,cy,rx+4,ry+3,0,0,7);ctx.stroke();
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2+.3;if(Math.sin(a)>.5)continue;ctx.globalAlpha=1;ctx.fillStyle='rgba(234,218,184,1)';ctx.beginPath();ctx.arc(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,4.5,0,7);ctx.fill();ctx.globalAlpha=.8;ctx.stroke();}ctx.globalAlpha=1;}
 houses.sort((a,b)=>a.y-b.y);for(const h of houses)drawHouse(ctx,h.x,h.y,h.w,h.h,h.id);
 if(t.size>1){const x=t.x+12,y=t.y-28,h=36+t.size*9,body=poly([[x,y],[x+12,y],[x+12,y-h],[x,y-h]]),cap=poly([[x-3,y-h],[x+6,y-h-20],[x+15,y-h]]);
  ctx.fillStyle='rgba(234,218,184,1)';ctx.fill(body);ctx.fill(cap);hatch(ctx,cap,2.2,-.6,'rgba(61,49,37,.6)',.5);ctx.strokeStyle=INK;ctx.lineWidth=.8;ctx.globalAlpha=.85;ctx.stroke(body);ctx.stroke(cap);ctx.beginPath();ctx.arc(x+6,y-h+10,3.2,0,7);ctx.stroke();ctx.globalAlpha=1;}
}
function drawLabel(ctx,t){
 ctx.font=`italic ${t.size===3?25:t.size===2?22:19}px Georgia,'Times New Roman',serif`;ctx.textAlign='center';ctx.textBaseline='alphabetic';
 ctx.lineWidth=3.2;ctx.strokeStyle='rgba(222,204,166,.85)';ctx.strokeText(t.name,t.x,t.y+26);ctx.fillStyle='rgba(46,36,26,.92)';ctx.fillText(t.name,t.x,t.y+26);
 if(t.size===3){const w=ctx.measureText(t.name).width*.42;ctx.strokeStyle='rgba(80,62,40,.5)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(t.x-w,t.y+31);ctx.quadraticCurveTo(t.x,t.y+34,t.x+w,t.y+31);ctx.stroke();}
}

// Paint one chunk; yields between layers so the caller can spread the work over frames.
function* paintChunk(W,ci,cj,detail,scratch){
 const C=CHUNK,X0=ci*C,Y0=cj*C,S=W.seed,px=Math.round((C+2*BLEED)*detail);
 const cv=document.createElement('canvas');cv.width=cv.height=px;const ctx=cv.getContext('2d');ctx.setTransform(detail,0,0,detail,-(X0-BLEED)*detail,-(Y0-BLEED)*detail);ctx.lineCap='round';ctx.lineJoin='round';
 yield* paperLayer(ctx,X0,Y0,S);
 const M=200,x0=X0-M,x1=X0+C+M,y0=Y0-M,y1=Y0+C+M;
 const towns=W.townsIn(x0-120,y0-120,x1+120,y1+120);
 const nearTown=(x,y,pad)=>towns.some(t=>Math.abs(x-t.x)<70+pad&&y>t.y-95-pad&&y<t.y+34+pad);
 // the old road the traveller follows: a faint double cart track
 const road=[];for(let x=x0;x<=x1;x+=12)road.push([x,W.routeY(x)]);
 wob(ctx,road.map(([x,y])=>[x,y-2.2]),S+1,{w:.6,col:PENCIL,alpha:.75,jit:.5});wob(ctx,road.map(([x,y])=>[x,y+2.2]),S+2,{w:.6,col:PENCIL,alpha:.75,jit:.5});
 // rivers and the bridges where the road crosses them
 for(let k=W.nearestRiver(x0)-1;k<=W.nearestRiver(x1)+1;k++){
  drawRiver(ctx,W,k,y0,y1,S);
  const c=W.crossing(k);if(c.x>x0-40&&c.x<x1+40){ctx.save();ctx.translate(c.x,c.y);ctx.fillStyle='rgba(222,206,170,1)';ctx.fillRect(-14,-6,28,12);ctx.strokeStyle=INK;ctx.lineWidth=.9;ctx.globalAlpha=.85;
   ctx.beginPath();ctx.moveTo(-15,-6);ctx.lineTo(15,-6);ctx.moveTo(-15,6);ctx.lineTo(15,6);ctx.stroke();ctx.lineWidth=.6;ctx.beginPath();for(const s of [-8,0,8]){ctx.moveTo(s-4,6);ctx.quadraticCurveTo(s,1,s+4,6);}ctx.stroke();
   ctx.beginPath();ctx.moveTo(-18,-9);ctx.lineTo(-15,-6);ctx.moveTo(18,-9);ctx.lineTo(15,-6);ctx.moveTo(-18,9);ctx.lineTo(-15,6);ctx.moveTo(18,9);ctx.lineTo(15,6);ctx.stroke();ctx.restore();ctx.globalAlpha=1;}
  // river name, written along the water a little way from the road
  const ly=c.y+(hash(k,1,S)<.5?-1:1)*(230+hash(k,2,S)*120);if(ly>y0&&ly<y1){const lx=W.riverX(k,ly),dx=W.riverX(k,ly+20)-lx;ctx.save();ctx.translate(lx+16,ly);ctx.rotate(Math.atan2(20,dx)-Math.PI/2);
   ctx.font='italic 15px Georgia,serif';ctx.fillStyle='rgba(70,56,40,.7)';ctx.textAlign='center';ctx.fillText(RIVER_NAMES[((k%8)+8)%8],0,0);ctx.restore();}
 }
 yield;
 // lanes from each off-road town to its nearest neighbour
 ctx.setLineDash([5,4]);
 const wide=W.townsIn(x0-700,y0-700,x1+700,y1+700);
 for(const t of wide){if(t.route)continue;let best=null,bd=620;for(const o of wide){if(o===t)continue;const d=Math.hypot(o.x-t.x,o.y-t.y);if(d<bd){bd=d;best=o;}}
  if(!best)continue;const minx=Math.min(t.x,best.x),maxx=Math.max(t.x,best.x),miny=Math.min(t.y,best.y),maxy=Math.max(t.y,best.y);if(maxx<x0||minx>x1||maxy<y0||miny>y1)continue;
  const mx=(t.x+best.x)/2+(hash(t.id,best.id,3)-.5)*60,my=(t.y+best.y)/2+(hash(best.id,t.id,4)-.5)*50;
  ctx.strokeStyle='rgba(92,78,58,.45)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.quadraticCurveTo(mx,my,best.x,best.y);ctx.stroke();}
 ctx.setLineDash([]);
 yield;
 // relief: peaks and downs on their own layer, nearer ones hiding those behind
 const rc=scratch.getContext('2d');rc.setTransform(1,0,0,1,0,0);rc.clearRect(0,0,scratch.width,scratch.height);rc.setTransform(detail,0,0,detail,-(X0-BLEED)*detail,-(Y0-BLEED)*detail);rc.lineCap='round';rc.lineJoin='round';
 const relief=[],PC=44;
 for(let i=Math.floor(x0/PC);i<=Math.floor(x1/PC);i++)for(let j=Math.floor(y0/PC);j<=Math.floor(y1/PC);j++){
  const x=(i+hash(i,j,S+40))*PC,y=(j+hash(i,j,S+41))*PC,m=W.mountain(x,y);if(m<.52)continue;
  const routeGap=Math.abs(y-W.routeY(x));if(routeGap<150||nearTown(x,y,40)||W.riverDist(x,y)<40)continue;
  if(x>-300&&x<60&&y>W.routeY(0)+230&&y<W.routeY(0)+420)continue;      // keep the cartouche clear
  if(m>=.6){const h=26+(m-.6)*260*(.7+hash(i,j,S+42)*.5);if(routeGap<150+h*.8)continue;relief.push({x,y,h,w:h*.62+8,id:i*977+j,peak:true});}
  else if(hash(i,j,S+43)<.35)relief.push({x,y,w:12+hash(i,j,S+44)*10,h:5+hash(i,j,S+45)*4,id:i*31+j});
 }
 relief.sort((a,b)=>a.y-b.y||a.x-b.x);for(const m of relief)m.peak?drawPeak(ctx,rc,m):drawHill(rc,m);
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(scratch,0,0,px,px,0,0,px,px);ctx.restore();
 yield;
 // woods, plus trees along river banks and beside villages
 const trees=[],TC=21;
 for(let i=Math.floor(x0/TC);i<=Math.floor(x1/TC);i++)for(let j=Math.floor(y0/TC);j<=Math.floor(y1/TC);j++){
  const x=(i+hash(i,j,S+50))*TC,y=(j+hash(i,j,S+51))*TC,f=W.forest(x,y),rd=W.riverDist(x,y);
  const want=f>.58?.85:(rd<40&&rd>16?.3:0)+(f>.5?.12:0);if(hash(i,j,S+52)>want)continue;
  if(Math.abs(y-W.routeY(x))<36||nearTown(x,y,8)||rd<15||W.mountain(x,y)>.56)continue;trees.push({x,y,h:15+hash(i,j,S+53)*12,id:i*7919+j});}
 trees.sort((a,b)=>a.y-b.y||a.x-b.x);for(const t of trees)drawTree(ctx,t.x,t.y,t.h,t.id);
 yield;
 // fields beside villages: strip plots with alternating furrows
 for(const t of towns){const side=hash(t.id,6,7)<.5?-1:1,fx=t.x+side*(88+hash(t.id,7,8)*24),fy=t.y+30+hash(t.id,8,9)*20;
  for(let a=0;a<2+t.size%2;a++)for(let b=0;b<2+(t.size>1?1:0);b++){const w=24+hash(t.id,a*3+b,10)*12,h=13+hash(t.id,a*3+b,11)*7,x=fx+(b-1)*29+a*7,y=fy+a*18;
   if(Math.abs(y-W.routeY(x))<24||W.riverDist(x,y)<22||hash(t.id,a*5+b,12)<.15)continue;const sk=(hash(t.id,a,b)-.5)*6,p=poly([[x,y],[x+w,y+sk],[x+w+3,y+h+sk],[x+2,y+h]]);
   hatch(ctx,p,3.3+hash(t.id,a+b,13)*1.6,(a+b)%2?-.6:.95,'rgba(92,78,58,.42)',.45);ctx.strokeStyle='rgba(92,78,58,.5)';ctx.lineWidth=.5;ctx.stroke(p);}}
 for(const t of towns)drawTown(ctx,t);
 for(const t of towns)drawLabel(ctx,t);
 // a cartouche near where the journey begins
 if(x0<200&&x1>-400&&y0<W.routeY(0)+420&&y1>W.routeY(0)+200){const cx=-230,cy=W.routeY(0)+300;ctx.save();ctx.translate(cx,cy);ctx.fillStyle='rgba(60,46,32,.85)';ctx.textAlign='left';
  ctx.font='11px Georgia,serif';ctx.fillText('A  SURVEY  OF',0,0);ctx.font='italic 26px Georgia,serif';ctx.fillText('The Western Marches',0,30);ctx.font='italic 12px Georgia,serif';ctx.fillStyle='rgba(80,62,42,.8)';ctx.fillText('Roads, waters & settlements',1,50);
  ctx.strokeStyle='rgba(70,54,36,.8)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,64);ctx.lineTo(220,64);ctx.stroke();for(let i=0;i<=4;i++){ctx.fillRect(i*55,60,1,8);if(i<4&&i%2===0)ctx.fillRect(i*55,62,55,3);}
  ctx.font='10px Georgia,serif';ctx.fillText('0',0,80);ctx.fillText('20 leagues',166,80);ctx.restore();}
 // a compass rose every so often in open country above the road
 for(let k=Math.floor(x0/2600);k<=Math.floor(x1/2600);k++){const cx=k*2600+520,cy=W.routeY(cx)-330;if(cx<x0||cx>x1||cy<y0||cy>y1||W.mountain(cx,cy)>.55)continue;
  ctx.save();ctx.translate(cx,cy);ctx.strokeStyle='rgba(70,52,36,.75)';ctx.lineWidth=.8;for(const r of [30,34]){ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();}
  for(let i=0;i<16;i++){ctx.save();ctx.rotate(i*Math.PI/8);const l=i%4===0?52:i%2===0?38:26;ctx.beginPath();ctx.moveTo(0,-l);ctx.lineTo(4.5,-6);ctx.lineTo(0,1);ctx.lineTo(-4.5,-6);ctx.closePath();ctx.stroke();
   ctx.beginPath();ctx.moveTo(0,-l);ctx.lineTo(0,1);ctx.lineTo(-4.5,-6);ctx.closePath();ctx.fillStyle=i%2?'rgba(110,90,64,.8)':'rgba(70,54,38,.85)';ctx.fill();ctx.restore();}
  ctx.font='13px Georgia,serif';ctx.fillStyle='rgba(60,46,32,.85)';ctx.textAlign='center';ctx.fillText('N',0,-60);ctx.restore();}
 return cv;
}

// ---------- the atlas: chunk cache + camera ----------
export function createAtlas(W,{maxChunks=18}={}){
 const cache=new Map(),order=[];let job=null,jobKey=null,detail=1.5,scratch=null;
 const key=(i,j)=>i+','+j;
 const atlas={W,cam:{x:0,y:0,ready:false},detail:()=>detail,
  setDetail(d){d=Math.round(clamp(d,1,2.4)*4)/4;if(d===detail)return;detail=d;cache.clear();order.length=0;job=null;jobKey=null;scratch=null;},
  wanted(view){const C=CHUNK,out=[];const i0=Math.floor(view.x0/C),i1=Math.floor((view.x1+C*.6)/C),j0=Math.floor(view.y0/C),j1=Math.floor(view.y1/C);
   for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)out.push([i,j,i<=Math.floor(view.x1/C)?0:1]);return out.sort((a,b)=>a[2]-b[2]);},
  // advance painting by about `budget` ms; visible chunks first, then the one ahead
  step(view,budget){
   const end=performance.now()+budget;
   while(performance.now()<end){
    if(!job){const next=atlas.wanted(view).find(([i,j])=>!cache.has(key(i,j)));if(!next)return true;
     const px=Math.round((CHUNK+2*BLEED)*detail);if(!scratch||scratch.width!==px){scratch=document.createElement('canvas');scratch.width=scratch.height=px;}
     job=paintChunk(W,next[0],next[1],detail,scratch);jobKey=key(next[0],next[1]);}
    const r=job.next();if(r.done){cache.set(jobKey,r.value);order.push(jobKey);job=null;
     while(order.length>maxChunks){const old=order.shift();cache.delete(old);}}
   }
   return false;
  },
  paintAllNow(view){while(!atlas.step(view,1000));},
  draw(ctx,view){
   const C=CHUNK;let missing=0;
   for(let i=Math.floor(view.x0/C);i<=Math.floor(view.x1/C);i++)for(let j=Math.floor(view.y0/C);j<=Math.floor(view.y1/C);j++){
    const k=key(i,j),cv=cache.get(k);if(cv){ctx.drawImage(cv,i*C-BLEED,j*C-BLEED,C+2*BLEED,C+2*BLEED);const at=order.indexOf(k);if(at>=0){order.splice(at,1);order.push(k);}}
    else{missing++;ctx.fillStyle=PAPER;ctx.fillRect(i*C,j*C,C,C);}}
   return missing;
  },
  chunkCount:()=>cache.size
 };
 return atlas;
}

// ---------- dissolve ----------
export function createDissolveNoise(w=288,h=184){
 const values=new Float32Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x/(w-1),v=y/(h-1);values[y*w+x]=clamp(fbm2(u*13,v*9,615,2)*.8+vn2(u*59,v*39,616)*.2+hash(x,y,617)*.03);}
 return {w,h,values};
}

// One frame of the journey map. `view` is computed from the camera; footprints are fixed on
// the paper and fade in as he walks.
export function drawJourney(ctx,atlas,trace,width,height,{zoom,cx,cy,dissolve=0,mask,noise,focus}){
 const base=ctx.baseScale||1;ctx.setTransform(base,0,0,base,0,0);
 ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(width/2,height/2);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const view={x0:cx-width/2/zoom,x1:cx+width/2/zoom,y0:cy-height/2/zoom,y1:cy+height/2/zoom};
 const missing=atlas.draw(ctx,view);
 for(const p of trace){
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=p.opacity*.88;ctx.fillStyle='#231b14';
  ctx.beginPath();ctx.ellipse(1.6,0,2.4,1.25,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(-2.7,0,1.15,1.05,0,0,7);ctx.fill();ctx.restore();
 }
 ctx.restore();
 // a soft darkening toward the screen edges, like lamplight on a table (not a paper edge)
 const g=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*.35,width/2,height/2,Math.hypot(width,height)*.62);
 g.addColorStop(0,'rgba(60,36,14,0)');g.addColorStop(1,'rgba(60,36,14,.28)');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
 if(dissolve>0)burn(ctx,width,height,dissolve,mask,noise,focus);
 return {view,missing};
}
function burn(ctx,width,height,dissolve,mask,noise,focus){
 const {w:nw,h:nh,values}=noise,scale=Math.min(1/3,420/Math.max(width,height)),w=Math.max(2,Math.round(width*scale)),h=Math.max(2,Math.round(height*scale));
 if(mask.width!==w||mask.height!==h){mask.width=w;mask.height=h;mask.inkData=null;mask.rim=null;}
 const mc=mask.getContext('2d');mask.inkData??=mc.createImageData(w,h);mask.rim??=Object.assign(document.createElement('canvas'),{width:w,height:h});
 const rc=mask.rim.getContext('2d');mask.rimData??=rc.createImageData(w,h);
 const data=mask.inkData.data,rim=mask.rimData.data,fx=focus.x/width,fy=focus.y/height,aspect=width/height,na=nw/nh;
 const sx=(aspect<na?aspect/na:1)*(nw-1)/(w-1),sy=(aspect<na?1:na/aspect)*(nh-1)/(h-1),cut=dissolve*1.32-.18,far=Math.hypot(Math.max(fx,1-fx)*aspect,Math.max(fy,1-fy));
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  const k=j*w+i,radial=Math.min(1,Math.hypot((i/(w-1)-fx)*aspect,j/(h-1)-fy)/far);
  const qx=i*sx,qy=j*sy,ix=Math.min(nw-2,qx|0),iy=Math.min(nh-2,qy|0),tx=qx-ix,ty=qy-iy,o=iy*nw+ix;
  const n=(values[o]*(1-tx)+values[o+1]*tx)*(1-ty)+(values[o+nw]*(1-tx)+values[o+nw+1]*tx)*ty;
  const v=radial*.62+n*.38,a=smooth((v-cut)/.014);data[k*4+3]=255*a;
  // a thin darkened paper edge where it gives way, and faded ink just behind it
  rim[k*4]=58;rim[k*4+1]=40;rim[k*4+2]=24;rim[k*4+3]=200*smooth(1-(v-cut)/.028)*a;
 }
 mc.putImageData(mask.inkData,0,0);rc.putImageData(mask.rimData,0,0);
 ctx.save();ctx.globalCompositeOperation='source-atop';ctx.drawImage(mask.rim,0,0,width,height);ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,width,height);ctx.restore();
}
