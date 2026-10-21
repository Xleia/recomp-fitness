const {test}=require('node:test'),assert=require('node:assert/strict');const api=require('../training-plans.js');const base=require('../plans/default-plan.json');
const source=()=>structuredClone(base);
const options=(id,activate=true,allowDuplicate=false)=>({entryId:id,importedAt:'2026-10-21T02:30:00.000Z',activate,allowDuplicate});
test('legacy state uses default without adding fields or modifying user data',async()=>{
 await api.loadDefault(async()=>({ok:true,json:async()=>source()}));const state={workouts:{old:{date:'2026-10-01'}},nutrition:{private:true}};const old=JSON.stringify(state);
 assert.equal(api.resolve(state).plan.plan_id,'recomp-default');assert.equal(api.library(state).versions.length,0);assert.equal(JSON.stringify(state),old);
});
test('save-only, enable new version, switch back and reset preserve all snapshots and actual data',()=>{
 let state={workouts:{old:{items:[{sets:[{w:50,r:8,done:true}]}]}},nutrition:{keep:'unchanged'}};const original=JSON.stringify(state);
 const p=source();p.plan_id='custom';p.name='自定义';state.plan_library=api.add(state,p,options('v1',false));assert.equal(api.resolve(state).entry,null);
 const next=structuredClone(p);next.plan_version='2.0';next.days[0].exercises[0].sets=2;state.plan_library=api.add(state,next,options('v2'));
 assert.equal(api.resolve(state).plan.plan_version,'2.0');state.plan_library=api.activate(state,'v1');assert.equal(api.resolve(state).plan.days[0].exercises[0].sets,3);
 state.plan_library=api.activate(state,null);assert.equal(api.resolve(state).entry,null);assert.equal(state.plan_library.versions.length,2);
 delete state.plan_library;assert.equal(JSON.stringify(state),original);
});
test('same ID/version never overwrites silently; explicit copies receive separate local IDs',()=>{
 const state={plan_library:api.add({},source(),options('a'))};const old=JSON.stringify(state);
 assert.throws(()=>api.add(state,source(),options('b')),/明确确认/);assert.equal(JSON.stringify(state),old);
 const next=api.add(state,source(),options('b',true,true));assert.equal(next.versions.length,2);assert.equal(next.versions[0].entry_id,'a');assert.equal(next.active_entry_id,'b');assert.equal(JSON.stringify(state),old);
});
test('corrupt active plan safely falls back without deleting raw library or journals',()=>{
 const plan=source();plan.days[0].exercises[0].sets=-1;const state={plan_library:{schema_version:1,versions:[{entry_id:'bad',imported_at:'2026-10-21T00:00:00.000Z',plan}],active_entry_id:'bad'},workouts:{keep:true}};const original=JSON.stringify(state);
 assert.equal(api.resolve(state).entry,null);assert.match(api.resolve(state).warning,/计划库异常/);assert.equal(JSON.stringify(state),original);assert.throws(()=>api.activate(state,null),/训练计划/);
});
