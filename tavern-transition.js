const VERSION = 'walk-speed-20261024';
const ROOT = new URL('./', import.meta.url);
const TAVERN = new URL(`tavern/?v=${VERSION}`, ROOT);
const TODAY = () => new Date().toLocaleDateString('sv-SE');

export function createTavernTransition({pauseGate} = {}) {
  let frame, badge, curtain, entered = false, waiting = false, ready = false, failed = false;
  let startedAt = 0, poll, cacheLimited = false;
  const current = () => `${TODAY()}/${VERSION}`;

  function say(message) {
    if (!badge) return;
    badge.textContent = message;
    badge.hidden = ready || entered;
    if (waiting) curtain.querySelector('p').textContent = message;
  }
  function makeUI() {
    if (frame) return;
    frame = document.createElement('iframe');
    frame.title = '贝尔维德酒馆二楼';
    frame.setAttribute('allow', 'autoplay');
    frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;opacity:0;pointer-events:none;z-index:10001;background:#171019';
    badge = document.createElement('div');
    badge.id = 'tavern-preload';
    badge.setAttribute('role', 'status');
    badge.style.cssText = 'position:fixed;right:12px;top:calc(env(safe-area-inset-top,0px) + 35px);z-index:8;max-width:min(52vw,300px);padding:7px 11px;border:1px solid #b28b56a3;border-radius:8px;color:#f7dfac;background:#171724db;font:12px/1.4 system-ui;text-align:right;pointer-events:none';
    curtain = document.createElement('div');
    curtain.id = 'tavern-curtain';
    curtain.hidden = true;
    curtain.style.cssText = 'position:fixed;inset:0;z-index:10002;display:none;place-content:center;gap:12px;padding:30px;text-align:center;background:#110e16;color:#f2ddba;font:16px/1.6 system-ui';
    curtain.innerHTML = '<h2 style="font:25px/1.4 Georgia,serif;margin:0">门后是贝尔维德酒馆</h2><p style="margin:0">正在为你准备二楼起居厅…</p><button type="button" style="justify-self:center;min-width:140px" hidden>重新准备酒馆</button>';
    curtain.querySelector('button').onclick = retry;
    document.body.append(frame, badge, curtain);
    say('酒馆正在备好，请继续查看邀请函…');
  }
  async function registerCache() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register(new URL('arrival-sw.js', ROOT), {scope: ROOT.pathname});
      await navigator.serviceWorker.ready;
      registration.active?.postMessage({type: 'KEEP_TODAY', day: TODAY()});
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type !== 'CACHE_LIMITED') return;
        cacheLimited = true;
        if (waiting) curtain.querySelector('p').textContent = '手机存储空间不足，已继续在线载入酒馆。';
      });
    } catch (error) { console.warn('酒馆缓存不可用，继续在线载入', error); }
  }
  function check() {
    if (!frame || entered) return;
    let tavern;
    try { tavern = frame.contentWindow.__tavern; } catch { /* iframe has not reached the same-origin scene yet */ }
    if (tavern?.state().ready) {
      ready = true; failed = false; clearInterval(poll);
      badge.hidden = true;
      if (waiting) reveal();
      return;
    }
    if (frame.contentDocument?.readyState === 'complete') {
      const status = frame.contentDocument.querySelector('#tavern-ui .status')?.textContent;
      if (status?.includes('载入家具')) say('酒馆布置中 · ' + status.replace('正在载入家具', '家具'));
      else if (status) say('酒馆布置中 · ' + status);
      if (frame.contentDocument.querySelector('#tavern-ui .note')?.textContent?.includes('场景载入失败')) failed = true;
    }
    if (Date.now() - startedAt > 180000) failed = true;
    if (waiting && failed) {
      curtain.querySelector('p').textContent = cacheLimited ? '存储空间不足或网络中断，请重新准备。' : '酒馆暂未载入，请检查网络后重试。';
      curtain.querySelector('button').hidden = false;
    }
  }
  async function prepare() {
    if (frame) return;
    makeUI(); startedAt = Date.now();
    try {
      if (localStorage.getItem('belvedere-tavern-ready-day') === current()) {
        waiting = true;
        curtain.hidden = false;
        curtain.style.display = 'grid';
        curtain.querySelector('p').textContent = '正在从今天的缓存恢复二楼场景…';
        badge.hidden = true;
      }
    } catch { /* Private storage is optional. */ }
    await registerCache();
    frame.src = TAVERN.href;
    poll = setInterval(check, 350);
  }
  function reveal() {
    if (!ready || entered) return;
    entered = true; waiting = false; clearInterval(poll);
    try { localStorage.setItem('belvedere-tavern-ready-day', current()); } catch { /* Private storage is optional. */ }
    curtain.querySelector('p').textContent = '炉火已亮。';
    requestAnimationFrame(() => {
      frame.style.opacity = '1'; frame.style.pointerEvents = 'auto';
      pauseGate?.();
      setTimeout(() => { curtain.style.display = 'none'; curtain.hidden = true; frame.contentWindow.focus(); }, 400);
    });
  }
  function enter() {
    waiting = true;
    if (!frame) prepare();
    curtain.hidden = false;
    curtain.style.display = 'grid';
    badge.hidden = true;
    if (ready) reveal();
    else if (!failed) curtain.querySelector('p').textContent = '酒馆正在备好，马上进入二楼大厅…';
  }
  function retry() {
    if (!frame) return prepare();
    clearInterval(poll); ready = failed = false; startedAt = Date.now();
    curtain.querySelector('button').hidden = true;
    curtain.querySelector('p').textContent = '重新准备二楼大厅…';
    frame.src = new URL(`tavern/?v=${VERSION}&retry=${Date.now()}`, ROOT).href;
    poll = setInterval(check, 350);
  }
  return {prepare, enter, status: () => ({ready, entered, waiting, failed, cacheLimited, frame: !!frame})};
}

