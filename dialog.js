// Dialogue in the style of the reference: a half-length portrait of the speaker at the lower
// left, a name plate, and a cream paper box along the bottom with typed-out text.
// The portrait uses the same character art as the guard in the scene (07 refuse, 10 allow,
// 11 offer, and the versions of 07/10 after the letter has been handed over), so the two
// never disagree. Each pose is split once into a body layer and a head layer (the art has
// clean alpha, so the head can turn a few degrees about the neck without leaving a seam).
// Emotion is carried by pose, head angle, the glint in the mask's eye hollows and framing:
// gestures in half-length, attentive or uncertain moments in a closer view. The mask has
// no mouth to animate, so none is drawn.
const $=id=>document.getElementById(id);
// per pose (768×1152 art): neck pivot and the two eye hollows; every pose is placed so its
// neck lands on the same point of the stage, so changing pose never jumps the head
const GEO={
 allow:{pivot:[345,286],eyes:[[300,198],[370,205]]},'allow-empty':{pivot:[345,286],eyes:[[300,198],[370,205]]},
 offer:{pivot:[440,300],eyes:[[400,215],[478,232]]},refuse:{pivot:[440,300],eyes:[[400,215],[478,232]]},'refuse-empty':{pivot:[440,300],eyes:[[400,215],[478,232]]}
};
const STAGE={w:360,h:432},AT=[222,186],SCALE=.6;
// expression → pose, framing and head/eye behaviour
const EXPR={
 greet:{pose:'allow',frame:'half',tilt:-1.5,dy:0,gaze:[0,0],glint:.75},
 hold:{pose:'allow',frame:'half',tilt:-.5,dy:0,gaze:[0,1],glint:.7},
 offer:{pose:'offer',frame:'half',tilt:2,dy:2,gaze:[1,1],glint:.85},
 wait:{pose:'allow-empty',frame:'close',tilt:0,dy:0,gaze:[0,2],glint:.7},
 pending:{pose:'allow-empty',frame:'close',tilt:2.5,dy:1,gaze:[-2,1],glint:.55},
 refuse:{pose:'refuse-empty',frame:'half',tilt:-3,dy:-2,gaze:[0,0],glint:1},
 puzzle:{pose:'allow-empty',frame:'close',tilt:7,dy:2,gaze:[-3,-1],glint:.5,squint:true},
 agree:{pose:'allow-empty',frame:'close',tilt:-2,dy:7,gaze:[0,2],glint:.9,nod:true}
};

export class Portrait{
 constructor(root){this.root=root;this.ready=false;this.layers={};this.expr=null;}
 async load(images){
  // images: {pose: decoded HTMLImageElement} for the poses in GEO
  const W=STAGE.w,H=STAGE.h;
  for(const [k,img] of Object.entries(images)){const geo=GEO[k];if(!geo)continue;
   const dx=AT[0]-geo.pivot[0]*SCALE,dy=AT[1]-geo.pivot[1]*SCALE,place=([x,y])=>[dx+x*SCALE,dy+y*SCALE];
   const body=document.createElement('canvas'),head=document.createElement('canvas');body.width=head.width=W;body.height=head.height=H;
   const bg=body.getContext('2d'),hg=head.getContext('2d');bg.imageSmoothingQuality=hg.imageSmoothingQuality='high';
   bg.drawImage(img,dx,dy,img.width*SCALE,img.height*SCALE);hg.drawImage(img,dx,dy,img.width*SCALE,img.height*SCALE);
   // head = everything above the jabot, feathered; body = the rest
   const cut=AT[1]-5,fe=6;
   const hm=hg.createLinearGradient(0,cut-fe,0,cut+fe);hm.addColorStop(0,'rgba(0,0,0,1)');hm.addColorStop(1,'rgba(0,0,0,0)');
   hg.globalCompositeOperation='destination-in';hg.fillStyle=hm;hg.fillRect(0,0,W,H);
   const bm=bg.createLinearGradient(0,cut-fe,0,cut+fe);bm.addColorStop(0,'rgba(0,0,0,0)');bm.addColorStop(1,'rgba(0,0,0,1)');
   bg.globalCompositeOperation='destination-in';bg.fillStyle=bm;bg.fillRect(0,0,W,H);
   const wrap=document.createElement('div');wrap.className='pose';wrap.dataset.pose=k;
   body.className='body';head.className='head';
   const origin=`${AT[0]}px ${AT[1]}px`;head.style.transformOrigin=origin;
   const eyes=geo.eyes.map(()=>{const e=document.createElement('i');e.className='glint';return e;});
   const headWrap=document.createElement('div');headWrap.className='headwrap';headWrap.style.transformOrigin=origin;headWrap.append(head,...eyes);
   eyes.forEach((e,i)=>{const [x,y]=place(geo.eyes[i]);e.style.left=x+'px';e.style.top=y+'px';});
   wrap.append(body,headWrap);this.root.querySelector('.cam').append(wrap);
   this.layers[k]={wrap,headWrap,eyes};
  }
  this.ready=true;this.set('greet');this.fit();addEventListener('resize',()=>this.fit());
  // blink: every few seconds the glints go out for a moment
  this.blinker=setInterval(()=>{if(document.hidden)return;this.root.classList.add('blink');setTimeout(()=>this.root.classList.remove('blink'),140);},3600+Math.random()*1200);
 }
 // the stage is laid out at 360×432 and scaled to the speaker's box
 fit(){const w=this.root.clientWidth||200;this.root.querySelector('.inner').style.transform=`scale(${w/360})`;}
 set(name){
  if(!this.ready)return;const e=EXPR[name]||EXPR.greet;this.expr=name;this.root.dataset.expr=name;
  for(const [k,l] of Object.entries(this.layers)){
   l.wrap.classList.toggle('on',k===e.pose);
   l.headWrap.style.transform=`translate(0,${e.dy*SCALE}px) rotate(${e.tilt}deg)`;
   l.eyes.forEach(g=>{g.style.transform=`translate(${e.gaze[0]}px,${e.gaze[1]}px) scaleY(${e.squint?.45:1})`;g.style.opacity=String(e.glint);});
  }
  this.root.querySelector('.cam').dataset.frame=e.frame;
  if(e.nod){const l=this.layers[e.pose];l.headWrap.animate([{transform:`translate(0,0) rotate(-1deg)`},{transform:`translate(0,${e.dy*SCALE}px) rotate(${e.tilt}deg)`},{transform:`translate(0,${2*SCALE}px) rotate(-1deg)`}],{duration:900,easing:'ease-in-out',fill:'forwards'});}
 }
}

// The box: typed text, tap to finish the line, tap again to continue; optional choices.
export class Dialog{
 constructor(){
  this.el=$('dialog');this.text=$('dialog-text');this.choices=$('dialog-choices');this.next=$('dialog-next');this.typing=null;this.resolve=null;
  this.portrait=new Portrait($('speaker'));
  const advance=e=>{if(this.el.hidden||this.choices.childElementCount)return;e?.preventDefault?.();if(this.typing){this.finish();return;}const r=this.resolve;this.resolve=null;r?.();};
  $('dialog-box').addEventListener('click',advance);
  addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!this.el.hidden&&document.activeElement?.tagName!=='INPUT')advance(e);});
 }
 show(){const was=this.el.hidden;this.el.hidden=false;if(was)this.portrait.fit();requestAnimationFrame(()=>this.el.classList.add('shown'));document.body.classList.add('talking');}
 hide(){this.el.classList.remove('shown');document.body.classList.remove('talking');return new Promise(r=>setTimeout(()=>{this.el.hidden=true;r();},260));}
 type(text){
  clearInterval(this.typing);this.text.textContent='';this.next.hidden=true;this.full=text;let i=0;
  const step=()=>{i++;this.text.textContent=text.slice(0,i);if(i>=text.length)this.finish();};
  this.typing=setInterval(step,38);
 }
 finish(){clearInterval(this.typing);this.typing=null;this.text.textContent=this.full;this.next.hidden=!!this.choices.childElementCount;}
 // say a line and wait for the player to continue
 say(text,expr){this.show();if(expr)this.portrait.set(expr);this.choices.replaceChildren();this.type(text);return new Promise(r=>this.resolve=r);}
 // say a line and offer choices; resolves with the chosen id
 ask(text,expr,options){
  this.show();if(expr)this.portrait.set(expr);this.choices.replaceChildren();this.type(text);
  return new Promise(r=>{for(const [id,label] of options){const b=document.createElement('button');b.type='button';b.textContent=label;
   b.onclick=e=>{e.stopPropagation();if(this.typing)this.finish();for(const o of this.choices.children)o.disabled=true;b.classList.add('picked');setTimeout(()=>{this.choices.replaceChildren();r(id);},160);};this.choices.append(b);}});
 }
 reset(){clearInterval(this.typing);this.typing=null;this.resolve=null;this.choices.replaceChildren();this.el.hidden=true;this.el.classList.remove('shown');document.body.classList.remove('talking');this.portrait.set('greet');}
}
