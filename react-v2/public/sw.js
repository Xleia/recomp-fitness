const VERSION='recomp-react-v2-cache-1';
const STATIC=[self.registration.scope,self.registration.scope+'index.html',self.registration.scope+'foods-mext-2023.csv',self.registration.scope+'plans/default-plan.json',self.registration.scope+'plans/training-plan.schema.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('recomp-react-v2-cache-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{const copy=response.clone();void caches.open(VERSION).then(cache=>cache.put(request,copy));return response;}).catch(async()=>await caches.match(request)||await caches.match(self.registration.scope)||Response.error()));return;}
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(VERSION).then(cache=>cache.put(request,copy));}return response;})));
});
