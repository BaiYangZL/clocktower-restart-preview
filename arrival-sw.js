// Caches the tavern files actually requested by Cocos, scoped to this GitHub Pages project.
const VERSION = 'walk-speed-20261024';
const PREFIX = 'belvedere-tavern-';
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
let warned = false;
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'KEEP_WEEK') return;
  event.waitUntil((async () => {
    const current = await cacheName();
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== current) await caches.delete(key);
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(tavernPath)) return;
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

