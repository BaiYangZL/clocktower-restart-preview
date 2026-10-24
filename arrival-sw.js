// Caches the tavern files actually requested by Cocos, scoped to this GitHub Pages project.
const VERSION = 'walk-speed-20261024';
const PREFIX = 'belvedere-tavern-';
const GATE_PREFIX = 'belvedere-gate-';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const day = () => new Date().toLocaleDateString('sv-SE');
const versionPrefix = `${PREFIX}${VERSION}-`;
let activeName;
async function cacheName() {
  if (activeName) return activeName;
  const candidates = (await caches.keys()).filter(key => key.startsWith(versionPrefix)).map(key => ({
    key, at: Date.parse(key.slice(versionPrefix.length)) || Number(key.slice(versionPrefix.length))
  })).filter(item => Number.isFinite(item.at) && Date.now() - item.at >= 0 && Date.now() - item.at < WEEK_MS);
  candidates.sort((a, b) => b.at - a.at);
  activeName = candidates[0]?.key || `${versionPrefix}${day()}`;
  return activeName;
}
const tavernPath = new URL('tavern/', self.registration.scope).pathname;
const rootPath = new URL('./', self.registration.scope).pathname;
const gateName = async () => (await cacheName()).replace(PREFIX, GATE_PREFIX);
let warned = false;
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'KEEP_WEEK') return;
  event.waitUntil((async () => {
    const current = await cacheName();
    const gateCurrent = await gateName();
    for (const key of await caches.keys()) if ((key.startsWith(PREFIX) && key !== current) || (key.startsWith(GATE_PREFIX) && key !== gateCurrent)) await caches.delete(key);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_GATE') return;
  event.waitUntil((async () => {
    const cache = await caches.open(await gateName());
    const urls = [self.registration.scope, ...(event.data.urls || [])];
    await Promise.all(urls.map(async value => {
      const url = new URL(value, self.registration.scope);
      if (url.origin !== self.location.origin || !url.pathname.startsWith(rootPath) || url.pathname.startsWith(tavernPath)) return;
      const key = url.pathname === rootPath ? self.registration.scope : url.href;
      if (await cache.match(key)) return;
      try {
        const response = await fetch(url.href, {cache: 'force-cache'});
        if (response.ok) await cache.put(key, response);
      } catch { /* Gate remains available online if caching fails. */ }
    }));
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(rootPath)) return;
  if (!url.pathname.startsWith(tavernPath)) {
    event.respondWith((async () => {
      const cache = await caches.open(await gateName());
      const key = request.mode === 'navigate' ? self.registration.scope : request;
      if (request.mode !== 'navigate') {
        const saved = await cache.match(key);
        if (saved) return saved;
      }
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(key, response.clone()).catch(() => {});
        return response;
      } catch {
        const saved = await cache.match(key);
        if (saved) return saved;
        throw new Error('城门页面不在缓存中');
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(await cacheName());
    const saved = await cache.match(request);
    if (saved) return saved;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone()).catch(async () => {
      if (warned) return;
      warned = true;
      for (const client of await self.clients.matchAll()) client.postMessage({type: 'CACHE_LIMITED'});
    });
    return response;
  })());
});

