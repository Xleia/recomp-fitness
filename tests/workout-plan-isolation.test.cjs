const {test}=require('node:test'),assert=require('node:assert/strict');const {harness}=require('./app-harness.cjs');
test('old saved workouts render their own names, groups and values, never current positional plan',async()=>{
 const h=harness();await h.ready();h.run(`state.workouts[trainDate]={date:trainDate,day:3,notes:'keep',items:[{name:'历史动作',custom:'keep',sets:[{w:41.5,r:7,done:true,rir:2}]}]};renderTraining();`);
 assert.equal(h.run('renderedWorkout.items[0].name'),'历史动作');assert.equal(h.run('renderedWorkout.items[0].sets'),1);
 assert.equal(h.doc.querySelector('[data-exercise="0"][data-set="0"][data-field="w"]').value,41.5);
 await h.run('saveWorkout()');assert.equal(h.run('state.workouts[trainDate].items[0].custom'),'keep');assert.equal(h.run('state.workouts[trainDate].items[0].sets[0].rir'),2);assert.equal(h.run('state.workouts[trainDate].plan_id'),undefined);
});
test('new workouts store immutable plan association and snapshot; planned values never fill actual sets',async()=>{
 const h=harness();await h.ready();h.run('renderTraining()');const w=h.doc.querySelector('[data-exercise="0"][data-set="0"][data-field="w"]');assert.equal(w.value,'');w.value='52.5';
 h.doc.querySelector('[data-exercise="0"][data-set="0"][data-field="r"]').value='9';h.doc.querySelector('[data-exercise="0"][data-set="0"][data-field="done"]').checked=true;
 await h.run('saveWorkout()');assert.equal(h.run('state.workouts[trainDate].plan_id'),'recomp-default');assert.equal(h.run('state.workouts[trainDate].items[0].sets[0].w'),52.5);assert.equal(h.run('state.workouts[trainDate].plan_snapshot.day.exercises[0].sets'),3);
});
test('quota failure leaves original disk, memory and nutrition unchanged',async()=>{
 const h=harness();await h.ready();h.run('renderTraining()');const original=h.run('JSON.stringify(state)'),disk=JSON.stringify([...h.storage]);h.context.localStorage.setItem=()=>{throw Error('存储空间不足');};
 await assert.rejects(h.run('saveWorkout()'),/存储空间不足/);assert.equal(h.run('JSON.stringify(state)'),original);assert.equal(JSON.stringify([...h.storage]),disk);
});
