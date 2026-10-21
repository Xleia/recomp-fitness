const {test}=require('node:test'),assert=require('node:assert/strict');const {harness}=require('./app-harness.cjs');const source=()=>structuredClone(require('../plans/default-plan.json'));
async function setup(){const h=harness();await h.ready();h.run('window.PlanManager.init();renderTraining();');return h;}
async function preview(h,value){const input=h.doc.getElementById('plan-import-file');input.files=[new File([typeof value==='string'?value:JSON.stringify(value)],'plan.json',{type:'application/json'})];await input.fire('change');}
const element=(h,id)=>h.doc.getElementById('plan-'+id);
test('preview and cancel never persist; malformed and unsupported files have clear errors',async()=>{
 const h=await setup(),old=h.run('JSON.stringify(state)'),disk=JSON.stringify([...h.storage]);
 await preview(h,source());assert.equal(element(h,'preview').hidden,false);assert.equal(h.run('JSON.stringify(state)'),old);
 await element(h,'import-cancel').fire('click');assert.equal(element(h,'preview').hidden,true);assert.equal(JSON.stringify([...h.storage]),disk);
 await preview(h,'{broken');assert.match(element(h,'manager-status').textContent,/不是合法 JSON/);
 const p=source();p.schema_version=99;await preview(h,p);assert.match(element(h,'manager-status').textContent,/不支持/);assert.equal(h.run('JSON.stringify(state)'),old);
});
test('import preview -> save only -> activate -> reset, real vault persists versions and history unchanged',async()=>{
 const h=await setup();h.run(`state.workouts['2026-10-20']={date:'2026-10-20',items:[{name:'旧动作',sets:[{w:35,r:9,done:true}]}]};state.nutrition.test={private:'keep'};`);
 const old=h.run('JSON.stringify([state.workouts,state.nutrition])');const p=source();p.plan_id='three-day';p.name='<img src=x onerror=alert(1)> 中文 日本語';p.plan_version='2';
 await preview(h,p);await element(h,'save-only').fire('click');assert.equal(h.run('state.plan_library.versions.length'),1);assert.equal(h.run('state.plan_library.active_entry_id'),null);
 const id=h.run('state.plan_library.versions[0].entry_id');element(h,'versions').value=id;await element(h,'activate').fire('click');assert.equal(h.run('activePlan().plan_id'),'three-day');
 await element(h,'reset-default').fire('click');assert.equal(h.run('activePlan().plan_id'),'recomp-default');assert.equal(h.run('state.plan_library.versions.length'),1);assert.equal(h.run('JSON.stringify([state.workouts,state.nutrition])'),old);
 const decoded=await h.run(`(async()=>{const e=parseEnvelope(localStorage.getItem(VAULT_KEY));return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(e.iv),additionalData:AAD,tagLength:128},keyRef,b64ToBytes(e.ciphertext))));})();`);
 assert.equal(decoded.plan_library.versions[0].plan.name,p.name);assert.equal(decoded.nutrition.test.private,'keep');
 assert.ok(![...h.storage.values()].some(value=>value.includes('three-day')));
});
test('write failures roll back imported library and keep preview for retry; duplicate confirmation can cancel',async()=>{
 const h=await setup(),old=h.run('JSON.stringify(state)'),disk=JSON.stringify([...h.storage]);await preview(h,source());const setter=h.context.localStorage.setItem;h.context.localStorage.setItem=()=>{throw Error('QuotaExceededError: 空间不足');};
 await element(h,'save-only').fire('click');assert.equal(h.run('JSON.stringify(state)'),old);assert.equal(JSON.stringify([...h.storage]),disk);assert.equal(element(h,'preview').hidden,false);assert.match(element(h,'manager-status').textContent,/空间不足/);
 h.context.localStorage.setItem=setter;await element(h,'save-only').fire('click');await preview(h,source());h.context.confirm=()=>false;await element(h,'save-only').fire('click');assert.equal(h.run('state.plan_library.versions.length'),1);
});
test('switching plan while historical date is selected never remaps its actions or completed sets',async()=>{
 const h=await setup();h.run(`state.workouts[trainDate]={date:trainDate,items:[{name:'旧卧推',sets:[{w:55,r:10,done:true},{w:null,r:null,done:false}]}]};renderTraining();`);const old=h.run('JSON.stringify(state.workouts)');
 const p=source();p.plan_id='changed';p.days.find(d=>d.weekday===3).exercises=[{exercise_id:'new-action',name:'完全不同的动作',order:1,sets:1,reps:10,rest_seconds:60}];
 await preview(h,p);await element(h,'save-enable').fire('click');assert.equal(h.run('activePlan().plan_id'),'changed');assert.equal(h.run('renderedWorkout.items[0].name'),'旧卧推');assert.equal(h.run('renderedWorkout.items[0].sets'),2);assert.equal(h.run('JSON.stringify(state.workouts)'),old);
});
test('cancel during async file read and session lock leave no private preview or stored plan',async()=>{
 const h=await setup();let release;const delayed={size:10,text:()=>new Promise(resolve=>{release=resolve;})};const input=element(h,'import-file');input.files=[delayed];const reading=input.fire('change');
 await element(h,'import-cancel').fire('click');release(JSON.stringify(source()));await reading;assert.equal(element(h,'preview').hidden,true);assert.equal(h.run('state.plan_library'),undefined);
 await preview(h,source());h.run('window.PlanManager.clearSession();');assert.equal(element(h,'preview').hidden,true);assert.equal(element(h,'preview-body').children.length,0);
});
test('cancel after confirmation but before encrypted write aborts the transaction',async()=>{
 const h=await setup();await preview(h,source());const before=h.run('JSON.stringify(state)'),disk=JSON.stringify([...h.storage]);
 h.run(`globalThis.originalSeal=seal;seal=async(...args)=>{await new Promise(resolve=>{globalThis.releaseEncryption=resolve;});return originalSeal(...args);};`);
 const saving=element(h,'save-only').fire('click');await new Promise(resolve=>setTimeout(resolve,0));
 await element(h,'import-cancel').fire('click');h.run('releaseEncryption();');await saving;
 assert.equal(h.run('JSON.stringify(state)'),before);assert.equal(JSON.stringify([...h.storage]),disk);assert.match(element(h,'manager-status').textContent,/取消/);
});
