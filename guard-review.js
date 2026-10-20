// Local inspection controls; only loaded with ?inspect=1. Never part of the story.
export function installReview(api){
 const bar=document.createElement('section');bar.id='guard-review';
 bar.style.cssText='position:fixed;z-index:1000;top:0;left:0;max-width:100%;background:#171b27ee;color:#fff;padding:8px;font:12px sans-serif';
 const status=document.createElement('output');status.style.display='block';bar.append(status);
 function button(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=fn;bar.append(b);}
 const choose=(phase,t=0)=>{
  api.cancelDialogue();api.freeze(true);api.story.started=true;
  api.story.letter=['offer','hold'].includes(phase);
  api.story.go(phase);api.story.g.x=534;api.story.g.y=910;
  api.story.g.dir='S';api.story.door=0;
  if(['push','reach','releaseDoor'].includes(phase)){api.story.authorized=true;api.story.g.x=678;api.story.g.y=830;api.story.g.dir='N';}
  if(phase==='releaseDoor')api.story.pushReleaseAt=1.8;
  api.ff(t);api.draw();
 };
 button('递信',()=>choose('offer',.6));
 button('拒绝',()=>choose('deny',.6));
 button('同意',()=>choose('accepted',.3));
 button('抬手贴门',()=>choose('reach',.65));
 button('推门接触',()=>choose('push',1.7));
 button('松手过渡',()=>choose('releaseDoor',.15));
 button('行走中段',()=>{choose('accepted');api.story.accept();api.story.lead();api.ff(2.7);api.draw();});
 button('开门全程',()=>{choose('accepted');api.story.accept();api.story.lead();api.freeze(false);});
 button('推进0.1秒',()=>{api.freeze(true);api.ff(.1);api.draw();});
 button('停住检查',()=>api.freeze(true));
 button('继续播放',()=>api.freeze(false));
 button('原版采样',()=>{api.scene.gate.guard.setSampling('original');api.draw();});
 button('清晰采样',()=>{api.scene.gate.guard.setSampling('sharp');api.draw();});
 document.body.append(bar);
 return ()=>{status.textContent=`审阅模式 · ${api.story.phase} · ${api.story.t.toFixed(2)}s · 门角 ${api.story.door.toFixed(2)} · ${api.frame()} · ${api.scene?.gate?.guard.sampling||'loading'}`;};
}
