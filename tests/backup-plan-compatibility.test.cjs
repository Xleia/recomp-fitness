const {test}=require('node:test'),assert=require('node:assert/strict');const {harness}=require('./app-harness.cjs');
test('original password encrypted backup round-trips both legacy and new plan fields',async()=>{
 const h=harness();await h.ready();
 const old=await h.run(`(async()=>{const key=await deriveKey('test-only-password-2026',saltRef);const before=JSON.stringify(state);const e=await seal(state,key,saltRef);const restored=await unseal(e,'test-only-password-2026');return {before,after:JSON.stringify(restored.value),hasPlan:Object.hasOwn(restored.value,'plan_library')};})();`);
 assert.equal(old.before,old.after);assert.equal(old.hasPlan,false);
 h.run(`state.plan_library=window.RecompPlans.add(state,window.RecompPlans.getDefault(),{entryId:'offline-version',importedAt:'2026-10-21T00:00:00.000Z',activate:true,allowDuplicate:false});`);
 const modern=await h.run(`(async()=>{const key=await deriveKey('test-only-password-2026',saltRef);const before=JSON.stringify(state);const e=await seal(state,key,saltRef);const restored=await unseal(e,'test-only-password-2026');return {before,after:JSON.stringify(restored.value),value:restored.value};})();`);
 assert.equal(modern.before,modern.after);assert.equal(modern.value.plan_library.active_entry_id,'offline-version');
 const cold=harness();cold.context.saved=modern.value;cold.run('state=saved;');assert.equal(cold.window.RecompPlans.getDefault(),null);
 assert.equal(cold.run('activePlan().plan_id'),'recomp-default');assert.equal(cold.run('window.RecompPlans.resolve(state).entry.entry_id'),'offline-version');
 await assert.rejects(cold.window.RecompPlans.loadDefault(async()=>{throw Error('offline');}),/offline/);
 assert.equal(cold.run('window.RecompPlans.resolve(state).entry.entry_id'),'offline-version');
});
