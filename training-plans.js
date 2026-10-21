/* Versioned public plan configuration. Imported private plans use the encrypted vault. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.RecompPlans=api;
})(typeof window==='object'?window:globalThis,()=>{
  'use strict';
  const MAX_BYTES=512*1024;
  const types=['strength','basketball','cardio','rest'];
  let defaultPlan=null,loadError=null,pending=null;
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  function fail(path,message){throw Error(`训练计划 ${path}：${message}`);}
  function object(v,path){if(!v||typeof v!=='object'||Array.isArray(v))fail(path,'必须是对象');}
  function keys(v,allowed,path){object(v,path);for(const key of Object.keys(v))if(!allowed.includes(key))fail(`${path}.${key}`,'不支持的字段');}
  function str(v,path,max=500,optional=false){if(optional&&v===undefined)return;if(typeof v!=='string'||!v.trim()||v.length>max)fail(path,`必须是 1–${max} 字符文本`);}
  function number(v,path,min,max,integer=false){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))fail(path,`必须是 ${min}–${max} 的${integer?'整数':'数字'}`);}
  function id(v,path){str(v,path,64);if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(v))fail(path,'只允许字母、数字、点、下划线和连字符');}
  function interval(v,path,min,max,integer=false,perSide=false){
    if(typeof v==='number'){number(v,path,min,max,integer);return;}
    keys(v,perSide?['min','max','per_side']:['min','max'],path);
    number(v.min,path+'.min',min,max,integer);number(v.max,path+'.max',min,max,integer);
    if(v.min>v.max)fail(path,'最小值不能大于最大值');
    if(own(v,'per_side')&&typeof v.per_side!=='boolean')fail(path+'.per_side','必须是布尔值');
  }
  function texts(v,path,max=20){if(!Array.isArray(v)||v.length>max)fail(path,'必须是文本数组');v.forEach((s,i)=>str(s,`${path}[${i}]`,200));}
  function exercise(ex,path,ids,orders){
    keys(ex,['exercise_id','name','order','sets','reps','planned_weight_kg','rest_seconds','rpe','rir','description','alternatives'],path);
    id(ex.exercise_id,path+'.exercise_id');if(ids.has(ex.exercise_id))fail(path,'动作ID重复');ids.add(ex.exercise_id);
    str(ex.name,path+'.name',100);number(ex.order,path+'.order',1,40,true);if(orders.has(ex.order))fail(path,'动作顺序重复');orders.add(ex.order);
    number(ex.sets,path+'.sets',1,20,true);interval(ex.reps,path+'.reps',1,1000,true,true);interval(ex.rest_seconds,path+'.rest_seconds',0,3600,true);
    if(own(ex,'planned_weight_kg'))number(ex.planned_weight_kg,path+'.planned_weight_kg',0,1000);
    if(own(ex,'rpe'))interval(ex.rpe,path+'.rpe',1,10);
    if(own(ex,'rir'))interval(ex.rir,path+'.rir',0,20);
    str(ex.description,path+'.description',2000,true);if(own(ex,'alternatives'))texts(ex.alternatives,path+'.alternatives');
  }
  function days(ds,path,full){
    if(!Array.isArray(ds)||ds.length>(7)||ds.length<(full?7:1))fail(path,full?'必须包含完整的七天安排':'必须包含 1–7 天安排');
    const weekdays=new Set(),dayIds=new Set(),exerciseIds=new Set();
    ds.forEach((d,i)=>{
      const p=`${path}[${i}]`;
      keys(d,['weekday','day_id','name','type','muscle_groups','description','home_description','duration_minutes','exercises'],p);
      number(d.weekday,p+'.weekday',0,6,true);if(weekdays.has(d.weekday))fail(p,'星期重复');weekdays.add(d.weekday);
      id(d.day_id,p+'.day_id');if(dayIds.has(d.day_id))fail(p,'训练日ID重复');dayIds.add(d.day_id);
      str(d.name,p+'.name',100);if(!types.includes(d.type))fail(p+'.type','类型必须为 strength / basketball / cardio / rest');
      texts(d.muscle_groups,p+'.muscle_groups');str(d.description,p+'.description',2000,true);str(d.home_description,p+'.home_description',2000,true);
      if(own(d,'duration_minutes'))number(d.duration_minutes,p+'.duration_minutes',1,1440,true);
      if(!Array.isArray(d.exercises)||d.exercises.length>40||(d.type==='strength'&&!d.exercises.length))fail(p+'.exercises','力量日须包含 1–40 个动作');
      if(d.type==='rest'&&d.exercises.length)fail(p+'.exercises','休息日不能配置训练动作');
      const orders=new Set();d.exercises.forEach((ex,j)=>exercise(ex,`${p}.exercises[${j}]`,exerciseIds,orders));
    });
  }
  function validate(source){
    let plan;
    try{const text=JSON.stringify(source);if(new TextEncoder().encode(text).length>MAX_BYTES)fail('文件','超过 512 KiB 限制');plan=JSON.parse(text);}catch(e){if(e.message.startsWith('训练计划'))throw e;fail('文件','不是有效 JSON 对象');}
    keys(plan,['format','schema_version','plan_id','plan_version','name','goal','duration_weeks','description','week_advice','days','weeks'],'根对象');
    if(plan.format!=='recomp-training-plan')fail('format','应为 recomp-training-plan');
    if(plan.schema_version!==1)fail('schema_version','不支持的数据结构版本，仅支持 1');
    id(plan.plan_id,'plan_id');str(plan.plan_version,'plan_version',64);str(plan.name,'name',100);str(plan.goal,'goal',500);number(plan.duration_weeks,'duration_weeks',1,104,true);str(plan.description,'description',3000,true);
    days(plan.days,'days',true);
    if(own(plan,'week_advice')){texts(plan.week_advice,'week_advice',104);if(plan.week_advice.length>plan.duration_weeks)fail('week_advice','超过计划周数');}
    if(own(plan,'weeks')){
      if(!Array.isArray(plan.weeks)||plan.weeks.length>plan.duration_weeks)fail('weeks','周次配置无效');
      const weeks=new Set();
      plan.weeks.forEach((week,i)=>{const path=`weeks[${i}]`;keys(week,['week','days'],path);number(week.week,path+'.week',1,plan.duration_weeks,true);if(weeks.has(week.week))fail(path,'周次重复');weeks.add(week.week);days(week.days,path+'.days',false);
        const replacements=new Map(week.days.map(day=>[day.weekday,day]));days(plan.days.map(day=>replacements.get(day.weekday)||day),path+'.resolved_days',true);
      });
    }
    return plan;
  }
  function dayFor(plan,weekday,week=1){return plan?.weeks?.find(w=>w.week===week)?.days.find(d=>d.weekday===weekday)||plan?.days.find(d=>d.weekday===weekday)||null;}
  function displayRange(value){if(value===null||value===undefined)return '';if(typeof value==='number')return String(value);return `${value.per_side?'每侧':''}${value.min===value.max?value.min:`${value.min}–${value.max}`}`;}
  function restLabel(seconds){if(seconds===null||seconds===undefined)return '';const values=typeof seconds==='number'?[seconds]:[seconds.min,seconds.max];const minute=values.every(v=>v>=120&&v%60===0);const value=typeof seconds==='number'?seconds/(minute?60:1):{min:seconds.min/(minute?60:1),max:seconds.max/(minute?60:1)};return displayRange(value)+(minute?'分钟':'秒');}
  async function loadDefault(fetcher=globalThis.fetch){
    if(defaultPlan)return defaultPlan;if(pending)return pending;
    pending=(async()=>{try{const response=await fetcher('./plans/default-plan.json',{cache:'no-cache'});if(!response.ok)throw Error('默认计划文件无法加载');defaultPlan=validate(await response.json());loadError=null;return defaultPlan;}catch(e){loadError=e;throw e;}finally{pending=null;}})();
    return pending;
  }
  return {MAX_BYTES,validate,dayFor,displayRange,restLabel,loadDefault,getDefault:()=>defaultPlan,getError:()=>loadError};
});
