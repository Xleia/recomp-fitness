const CACHE = 'recomp-private-shell-v10';
const FILES = ['./','./index.html','./styles.css','./app.js','./food-zh.js','./nutrition.js','./dishes.js','./dishes.css','./foods-mext-2023.csv','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET' || new URL(req.url).origin !== self.location.origin)return;
  const url = new URL(req.url);
  const isShell=FILES.some(path=>new URL(path,self.registration.scope).pathname===url.pathname);
  if(!isShell)return;
  event.respondWith(fetch(req).then(response => {
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
    return response;
  }).catch(()=>caches.match(req).then(cached=>cached || (req.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
