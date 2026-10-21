const {test}=require('node:test');const assert=require('node:assert/strict');
const api=require('../training-plans.js');const original=require('./default-plan-original.json');const source=require('../plans/default-plan.json');
const clone=()=>structuredClone(source);
test('default JSON exactly preserves all original training tuples and week guidance',()=>{
 const plan=api.validate(source);assert.deepEqual(plan.week_advice,original.WEEK_ADVICE);assert.equal(plan.duration_weeks,8);
 for(const [weekday,day] of Object.entries(original.EXERCISES)){
   const result=api.dayFor(plan,Number(weekday));assert.equal(result.name,day.title);assert.equal(result.description,day.desc);
   assert.deepEqual(result.exercises.map(ex=>[ex.name,ex.sets,api.displayRange(ex.reps),api.restLabel(ex.rest_seconds),api.displayRange(ex.rir)]),day.items);
 }
 assert.equal(api.dayFor(plan,6).type,'basketball');assert.equal(api.dayFor(plan,6).duration_minutes,240);
 assert.equal(api.dayFor(plan,0).type,'rest');assert.equal(api.dayFor(plan,2).type,'rest');
});
test('reject unsupported schema, invalid ranges, IDs, weekdays, rest, reps and unsafe unknown fields',()=>{
 for(const mutate of [p=>p.schema_version=2,p=>p.days[0].weekday=7,p=>p.days[1].weekday=1,p=>p.days[0].exercises[0].sets=0,p=>p.days[0].exercises[0].reps={min:12,max:8},p=>p.days[0].exercises[0].rest_seconds=-1,p=>p.days[0].exercises[1].exercise_id=p.days[0].exercises[0].exercise_id,p=>p.days[0].exercises[1].order=1,p=>p.password='secret',p=>p.days[1].exercises=p.days[0].exercises]){
   const plan=clone();mutate(plan);assert.throws(()=>api.validate(plan),/训练计划/);
 }
 assert.throws(()=>api.validate(JSON.parse('{"__proto__":{},"format":"recomp-training-plan"}')),/不支持/);
});
test('week overrides use the same schema without changing other weeks or days',()=>{
 const p=clone();const day=structuredClone(p.days[0]);day.exercises[0].sets=2;p.weeks=[{week:5,days:[day]}];
 const plan=api.validate(p);assert.equal(api.dayFor(plan,1,5).exercises[0].sets,2);assert.equal(api.dayFor(plan,1,1).exercises[0].sets,3);
 assert.equal(api.dayFor(plan,3,5).name,api.dayFor(plan,3,1).name);
 p.weeks[0].week=9;assert.throws(()=>api.validate(p),/1–8/);
});
test('failed default file loads can be retried; no embedded template fallback',async()=>{
 await assert.rejects(api.loadDefault(async()=>({ok:false})),/无法加载/);assert.equal(api.getDefault(),null);
 const result=await api.loadDefault(async()=>({ok:true,json:async()=>clone()}));assert.equal(result.plan_id,source.plan_id);
 assert.equal(api.getError(),null);
});
