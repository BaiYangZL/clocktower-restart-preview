// The invitation. At the hand-over the black envelope is taken from the youth's glove and
// lifted into the traveller's view from below (the traveller's own hands stay out of shot);
// it settles, the crimson seal breaks, the flap opens and the card slides out with the
// pass-phrase form. Verification is done by the server (/api/unlock); nothing here decides
// success.
const $=id=>document.getElementById(id);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// Paper grain for the card and the dialogue box, painted once (not an image download).
export function paintPaper(){
 const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d');
 g.fillStyle='#f4ead3';g.fillRect(0,0,160,160);
 let s=7;const r=()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<900;i++){g.fillStyle=`rgba(${r()<.5?'120,90,50':'255,252,240'},${.03+r()*.05})`;g.fillRect(r()*160,r()*160,1+r()*2,1);}
 for(let i=0;i<60;i++){g.strokeStyle='rgba(140,108,66,.07)';g.lineWidth=.6;g.beginPath();const x=r()*160,y=r()*160;g.moveTo(x,y);g.lineTo(x+4+r()*10,y+(r()-.5)*3);g.stroke();}
 document.documentElement.style.setProperty('--paper',`url(${c.toDataURL()})`);
}

export class Invitation{
 constructor({onSubmit,onResult,onClose}){
  this.state='closed';this.busy=false;this.locked=false;this.epoch=0;this.onSubmit=onSubmit;this.onResult=onResult;this.onClose=onClose;this.el=$('letter');
  $('letter-form').addEventListener('submit',e=>{e.preventDefault();this.submit().then(r=>{if(r)this.onResult?.(r);});});
  $('letter-later').onclick=()=>this.close(true);
  $('passcode').addEventListener('input',()=>{if(this.state==='invalid'){this.state='open';this.status('');}});
  // keep the card above the on-screen keyboard
  const vv=window.visualViewport;if(vv){const fit=()=>{const lift=Math.max(0,innerHeight-vv.height-vv.offsetTop);document.documentElement.style.setProperty('--kb',lift+'px');};vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);}
 }
 status(text,kind=''){const s=$('letter-status');s.textContent=text;s.dataset.kind=kind;}
 // the hand-over: rise → settle → seal breaks → flap opens → card out
 async receive(){
  if(this.state!=='closed')return;this.state='opening';const el=this.el;el.hidden=false;el.className='';
  void el.offsetWidth;el.classList.add('rise');await wait(420);
  el.classList.add('unseal');await wait(320);el.classList.add('open');await wait(380);el.classList.add('out');await wait(360);
  this.state='open';document.body.classList.add('reading');
  if(!matchMedia('(pointer:coarse)').matches)$('passcode').focus({preventScroll:true});
 }
 // fold the card back for the reply; `keep` leaves a tab to reopen it
 async close(keep=true){
  if(this.busy)return;$('passcode').blur();document.body.classList.remove('reading');
  this.el.classList.remove('out');await wait(240);this.el.classList.add('down');await wait(320);
  this.el.hidden=true;this.el.className='';this.state=keep?'tucked':'closed';$('letter-reopen').hidden=!keep;this.onClose?.(keep);
 }
 async reopen(){$('letter-reopen').hidden=true;this.locked=false;this.state='opening';const el=this.el;el.hidden=false;el.className='rise unseal open';void el.offsetWidth;el.classList.add('out');await wait(360);this.state='open';document.body.classList.add('reading');}
 setBusy(b){this.busy=b;$('letter-submit').disabled=b;$('letter-later').disabled=b;$('passcode').readOnly=b;$('letter-submit').textContent=b?'核对中…':'呈上密语';this.el.classList.toggle('busy',b);}
 async submit(){
  if(this.busy||this.locked||!['open','invalid'].includes(this.state))return; // no double submit
  const code=$('passcode').value.trim();
  if(!code){this.state='invalid';this.status('请先写下信上的通行密语。','warn');$('passcode').focus();return;}
  if(code.length>32){this.state='invalid';this.status('密语太长了，请再核对一次。','warn');return;}
  const epoch=this.epoch;this.setBusy(true);this.status('守门人正在核对……','busy');
  let result;try{result=await this.onSubmit(code);}catch{result={kind:'network'};}
  if(epoch!==this.epoch)return; // an old request must not affect a replay
  this.setBusy(false);this.status('');this.state='answered';
  // Every reply belongs to the story until the letter is explicitly reopened.
  this.locked=true;
  return result;
 }
 reset(){this.epoch++;this.state='closed';this.busy=false;this.locked=false;$('passcode').value='';this.status('');this.setBusy(false);this.el.hidden=true;this.el.className='';$('letter-reopen').hidden=true;document.body.classList.remove('reading');}
}

// Ask the server. Timeouts and 5xx are network trouble, 401 is a real refusal.
export async function verify(code,{timeout=12000}={}){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
 try{
  const r=await fetch('/api/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),signal:ctl.signal});
  if(r.status===200){const j=await r.json().catch(()=>({}));return j.ok?{kind:'ok'}:{kind:'denied'};}
  if(r.status===401)return {kind:'denied'};
  if(r.status===429)return {kind:'limited',wait:Number(r.headers.get('Retry-After'))||30};
  return {kind:'network'};
 }catch{return {kind:'network'};}
 finally{clearTimeout(timer);}
}
