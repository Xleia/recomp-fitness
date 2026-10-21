const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('Service Worker caches public plan and manager assets and returns default JSON when network is offline',async()=>{
 const scope='https://example.test/recomp/',handlers={},entries=new Map(),requested=[];
 const key=request=>new URL(typeof request==='string'?request:request.url,scope).href;
 const caches={async open(){return {async addAll(files){for(const file of files){requested.push(file);const relative=file==='./'?'index.html':file.replace(/^\.\//,'');const local=path.join(__dirname,'../',relative);const content=fs.existsSync(local)?fs.readFileSync(local):'public-icon';entries.set(key(file),new Response(content));}},async put(request,response){entries.set(key(request),response);}};},async keys(){return [];},async delete(){return true;},async match(request){return entries.get(key(request))?.clone();}};
 const self={registration:{scope},location:{origin:'https://example.test'},clients:{async claim(){}},async skipWaiting(){},addEventListener(type,fn){handlers[type]=fn;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),{self,caches,URL,Response,fetch:async()=>{throw Error('offline');}});
 let installing;handlers.install({waitUntil(p){installing=p;}});await installing;
 assert.ok(requested.includes('./plans/default-plan.json'));assert.ok(requested.includes('./training-plans.js'));assert.ok(requested.includes('./plan-manager.js'));
 let responding;handlers.fetch({request:new Request(scope+'plans/default-plan.json'),respondWith(p){responding=p;}});const response=await responding;
 assert.equal((await response.json()).format,'recomp-training-plan');assert.ok(!requested.some(file=>/plan_library|private|backup/.test(file)));
});
