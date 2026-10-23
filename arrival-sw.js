// Caches the tavern files actually requested by Cocos, scoped to this GitHub Pages project.
const VERSION = 'walk-speed-20261024';
const PREFIX = 'belvedere-tavern-';
const day = () => new Date().toLocaleDateString('sv-SE');
const name = () => `${PREFIX}${VERSION}-${day()}`;
const tavernPath = new URL('tavern/', self.registration.scope).pathname;
let warned = false;
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'KEEP_TODAY') return;
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== name()) await caches.delete(key);
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(tavernPath)) return;
  event.respondWith((async () => {
    const cache = await caches.open(name());
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
