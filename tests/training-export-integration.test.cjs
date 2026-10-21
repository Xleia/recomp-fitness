const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const {webcrypto}=require('node:crypto');
const assets='../';
class Element{
 constructor(doc,id){this.doc=doc;this.id=id;this.listeners={};this.value='';this.hidden=false;this.disabled=false;this.attrs={};this.children=[];this.textContent='';}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 async fire(type){for(const fn of this.listeners[type]||[])await fn({preventDefault(){}});}
 set innerHTML(value){for(const m of value.matchAll(/id="([^"]+)"/g))this.doc.elements[m[1]]=new Element(this.doc,m[1]);}
 closest(){return this;} append(el){this.children.push(el);} removeAttribute(k){delete this[k];} }
function environment(){
 const document={elements:{},listeners:{},readyState:'loading',hidden:false,addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},getElementById(id){return this.elements[id]||null;},createElement(){return new Element(this,'');}};
 for(const id of ['backup-btn','lock-btn','manual-lock','delete-vault','import-btn'])document.elements[id]=new Element(document,id);
 const storage=new Map(),blobs=new Map();let shareCalls=0;
 const context=vm.createContext({document,window:{addEventListener(){}},navigator:{canShare:()=>true,share:async()=>{shareCalls++;}},
   URL:{createObjectURL(file){blobs.set('blob:test',file);return 'blob:test';},revokeObjectURL(url){blobs.delete(url);}},
   localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Intl,Date,TextEncoder,TextDecoder,Uint8Array,Blob,File,crypto:webcrypto,
   setTimeout,clearTimeout,confirm:()=>true,atob,btoa,console,structuredClone});
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,assets+'training-export.js'),'utf8'),context);
 document.listeners.DOMContentLoaded.at(-1)();document.elements['training-export-format'].value='json';
 return {context,document,storage,blobs,getShareCalls:()=>shareCalls};
}
test('production UI exports actual persisted AES-GCM vault, then download/share, filter and lock',async()=>{
 const env=environment(),{context,document,storage,blobs}=env;const get=id=>document.elements['training-export-'+id];
 await vm.runInContext(`(async()=>{keyRef=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);saltRef=crypto.getRandomValues(new Uint8Array(16));
 const saved={workouts:{'2026-10-21':{date:'2026-10-21',day:3,items:[{name:'实际记录 ベンチ',sets:[{w:62.5,r:9,done:true}]}]}},nutrition:{private:'never export'},legacyHistory:[]};
 localStorage.setItem(VAULT_KEY,JSON.stringify(await seal(saved,keyRef,saltRef)));state={workouts:{fake:{date:'2000-01-01'}}};})();`,context);
 const original=JSON.stringify([...storage]);
 await get('create').fire('click');assert.match(get('status').textContent,/1 条训练记录/);assert.equal(get('ready').hidden,false);assert.equal(get('share').hidden,false);
 const file=blobs.get('blob:test');assert.match(file.name,/^RECOMP_training_export_\d{4}-\d{2}-\d{2}\.json$/);
 const data=JSON.parse(await file.text());assert.equal(data.workouts['2026-10-21'].items[0].sets[0].w,62.5);assert.equal(data.workouts.fake,undefined);assert.equal(data.nutrition,undefined);
 assert.equal(original,JSON.stringify([...storage]));await get('share').fire('click');assert.equal(env.getShareCalls(),1);
 get('start').value='2026-10-22';await get('create').fire('click');assert.match(get('status').textContent,/没有训练记录/);assert.equal(get('ready').hidden,true);
 get('start').value='';get('format').value='csv';await get('create').fire('click');const bytes=new Uint8Array(await blobs.get('blob:test').arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);
 await document.elements['manual-lock'].fire('click');assert.equal(get('ready').hidden,true);assert.equal(blobs.size,0);
 vm.runInContext('state=null;keyRef=null;',context);await get('create').fire('click');assert.match(get('status').textContent,/先解锁/);
 assert.equal(original,JSON.stringify([...storage]));
});
test('persistence errors prevent export',async()=>{
 const {context,document,blobs}=environment(),get=id=>document.elements['training-export-'+id];
 vm.runInContext('state={};keyRef={};writeQueue=Promise.reject(Error("保存失败"));',context);
 await get('create').fire('click');assert.equal(get('status').textContent,'保存失败');assert.equal(blobs.size,0);
});
test('locking while waiting for pending save prevents plaintext generation',async()=>{
 const {context,document,blobs}=environment(),get=id=>document.elements['training-export-'+id];
 vm.runInContext('state={};keyRef={};writeQueue=new Promise(resolve=>{globalThis.releaseSave=resolve;});',context);
 const exporting=get('create').fire('click');
 vm.runInContext('locking=true;authGeneration++;releaseSave();',context);
 await exporting;assert.match(get('status').textContent,/锁定或切换/);assert.equal(blobs.size,0);
});
