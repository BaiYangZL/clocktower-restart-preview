// The loading companion: a small hooded traveller with a lantern walks along a strip of
// paper at the top of the map while the gate is being prepared. He never shows a percentage.
// walk → still loading; arrive → everything is ready (he stops and lifts his lantern);
// rest → a download failed (he sits by his lantern and waits for a retry).
const W=64,H=26,S=3;
const P={k:'#1c1410',c0:'#4b2f22',c1:'#6e4630',c2:'#8f6143',s:'#e8c7a4',b:'#2c2018',l0:'#f6c25a',l1:'#fff0b8',m:'#5d4e3c',f:'#2a211a'};
export class Mascot{
 constructor(canvas){this.cv=canvas;canvas.width=W*S;canvas.height=H*S;this.g=canvas.getContext('2d');this.g.imageSmoothingEnabled=false;this.t=0;this.state='walk';this.prints=[];this.scroll=0;this.since=0;}
 set(state){if(state!==this.state){this.state=state;this.since=0;}}
 px(x,y,c){this.g.fillStyle=c;this.g.fillRect(Math.round(x)*S,Math.round(y)*S,S,S);}
 rect(x,y,w,h,c){this.g.fillStyle=c;this.g.fillRect(Math.round(x)*S,Math.round(y)*S,w*S,h*S);}
 tick(dt){
  this.t+=dt;this.since+=dt;const g=this.g;g.clearRect(0,0,W*S,H*S);
  const walking=this.state==='walk',frame=Math.floor(this.t*8)%8,bob=walking?[0,1,1,0,0,1,1,0][frame]:0;
  // the path: a pencil line with his footprints scrolling away behind him
  if(walking)this.scroll+=dt*14;
  for(let x=2;x<W-2;x+=2)this.px(x,H-3,(x+Math.floor(this.scroll))%4<2?P.m:'#8a7a60');
  for(let k=0;k<6;k++){const x=((30-k*5-this.scroll%5)+W)%W;if(x<6||x>W-6||x>30)continue;this.px(x,H-4-(k%2),P.f);}
  const cx=34,base=H-4;
  if(this.state==='rest'){
   // seated, knees up, lantern set down beside him and glowing low
   this.rect(cx-3,base-6,7,6,P.c1);this.rect(cx-3,base-6,2,6,P.c2);this.rect(cx-2,base-11,5,5,P.c0);this.px(cx-1,base-9,P.s);this.px(cx+1,base-9,P.s);
   this.rect(cx+5,base-4,3,4,P.b);this.px(cx+6,base-3,Math.floor(this.t*3)%2?P.l1:P.l0);this.px(cx+6,base-5,P.b);
   if(Math.floor(this.t*1.5)%2)this.px(cx+1,base-14,'#8a7a60');return;
  }
  // walking or arrived: cloak, hood, staff, lantern
  const leg=walking?[0,1,2,1,0,-1,-2,-1][frame]:0,y0=base-bob;
  this.rect(cx-2+leg*.5,base-3,1,3,P.b);this.rect(cx+1-leg*.5,base-3,1,3,P.b);
  this.rect(cx-3,y0-10,7,8,P.c1);this.rect(cx-3,y0-10,2,8,P.c2);this.rect(cx+3,y0-9,1,7,P.c0);
  this.rect(cx-2,y0-14,5,5,P.c0);this.rect(cx-1,y0-13,3,3,P.c1);this.px(cx+1,y0-12,P.s);this.px(cx+2,y0-12,P.s);
  this.rect(cx+2,y0-17,1,1,P.c0);
  // bundle on a stick over the shoulder
  for(let k=0;k<6;k++)this.px(cx-2-k,y0-13+k*.4,P.b);this.rect(cx-9,y0-13,3,3,P.c2);
  // the lantern: swinging while he walks, held high when he arrives
  const up=this.state==='arrive'?Math.min(1,this.since*3):0,sw=walking?Math.sin(this.t*8)*1:0;
  const lx=cx+5+sw,ly=y0-5-up*7;this.rect(cx+4,ly-1,1,3+up*4,P.c0);
  this.rect(lx,ly,3,4,P.b);this.px(lx+1,ly+1,P.l1);this.px(lx+1,ly+2,P.l0);
  const glow=this.state==='arrive'?.38:.22,gr=g.createRadialGradient((lx+1.5)*S,(ly+2)*S,1,(lx+1.5)*S,(ly+2)*S,10*S);
  gr.addColorStop(0,`rgba(255,214,120,${glow})`);gr.addColorStop(1,'rgba(255,214,120,0)');g.fillStyle=gr;g.fillRect(0,0,W*S,H*S);
  if(this.state==='arrive'&&this.since<1.2){const a=this.since*6;for(let k=0;k<4;k++){const ang=a+k*Math.PI/2;this.px(lx+1+Math.cos(ang)*4,ly+2+Math.sin(ang)*3,P.l1);}}
 }
}
