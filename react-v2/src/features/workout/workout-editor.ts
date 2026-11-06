import type { WorkoutItem, WorkoutRecord, WorkoutSet } from '../../types/state';
import type { PlanDay, TrainingPlan } from '../plans/plan-data';
export type WorkoutDraftItem={exercise_id?:string;name:string;sets:WorkoutSet[]};
export function weekdayFromDate(date:string):number{if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NaN;const d=new Date(date+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===date?d.getUTCDay():NaN;}
export function trainingWeek(startDate:unknown,selectedDate:string,duration:number):number{if(typeof startDate!=='string'||weekdayFromDate(startDate)<0||weekdayFromDate(selectedDate)<0)return 1;const start=new Date(startDate+'T12:00:00Z').getTime(),selected=new Date(selectedDate+'T12:00:00Z').getTime();return Math.max(1,Math.min(duration,Math.floor((selected-start)/(7*86400000))+1));}
export function planDayForDate(plan:TrainingPlan|null,date:string,startDate:unknown):PlanDay|null{if(!plan)return null;const weekday=weekdayFromDate(date);if(!Number.isInteger(weekday))return null;const week=trainingWeek(startDate,date,plan.duration_weeks);return plan.weeks?.find(x=>x.week===week)?.days.find(x=>x.weekday===weekday)??plan.days.find(x=>x.weekday===weekday)??null;}
export function makeWorkoutDraft(saved:WorkoutRecord|undefined,template:PlanDay|null):WorkoutDraftItem[]{if(saved&&Array.isArray(saved.items))return saved.items.map(item=>({...typeof item.exercise_id==='string'?{exercise_id:item.exercise_id}:{},name:typeof item.name==='string'?item.name:'未命名动作',sets:(Array.isArray(item.sets)?item.sets:[]).map(set=>({...set}))}));return(template?.exercises??[]).map(ex=>({exercise_id:ex.exercise_id,name:ex.name,sets:Array.from({length:ex.sets},()=>({w:null,r:null,done:false}))}));}
export function buildWorkoutRecord(args:{date:string;day:number;template:PlanDay|null;plan:TrainingPlan|null;week:number;existing?:WorkoutRecord;items:WorkoutDraftItem[];note?:string;durationMinutes?:number|null}):WorkoutRecord{
 const {date,day,template,plan,existing,items}=args;if(weekdayFromDate(date)!==day)throw new Error('训练日期无效');if(!items.length)throw new Error('当天没有可保存的训练动作');
 const record:WorkoutRecord=existing?structuredClone(existing):{date,day,items:[]};record.date=date;record.day=day;record.items=items.map((item):WorkoutItem=>({...item.exercise_id?{exercise_id:item.exercise_id}:{},name:item.name.slice(0,140),sets:item.sets.map((set):WorkoutSet=>{
  const w=set.w==null?null:Number(set.w),r=set.r==null?null:Number(set.r);
  if(w!==null&&(!Number.isFinite(w)||w<0||w>1000))throw new Error('重量填写不合理');if(r!==null&&(!Number.isInteger(r)||r<0||r>1000))throw new Error('次数填写不合理');
  const result:WorkoutSet={...set,w,r,done:set.done===true};
  if(set.rpe!=null&&set.rpe!==''&&(!Number.isFinite(Number(set.rpe))||Number(set.rpe)<1||Number(set.rpe)>10))throw new Error('RPE 应在 1～10 之间');
  if(set.rir!=null&&set.rir!==''&&(!Number.isFinite(Number(set.rir))||Number(set.rir)<0||Number(set.rir)>20))throw new Error('RIR 应在 0～20 之间');
  if(set.rpe!=null&&set.rpe!=='')result.rpe=Number(set.rpe);if(set.rir!=null&&set.rir!=='')result.rir=Number(set.rir);return result;
 })}));
 if(!existing&&template&&plan){record.title=template.name;record.bodyParts=[...template.muscle_groups];record.plan_id=plan.plan_id;record.plan_version=plan.plan_version;record.plan_snapshot={plan_id:plan.plan_id,plan_version:plan.plan_version,week:args.week,day:structuredClone(template)};}
 const note=args.note?.trim().slice(0,500);if(note)record.note=note;else delete record.note;
 const duration=args.durationMinutes;if(duration==null||duration===0)delete record.duration_minutes;else{if(!Number.isInteger(duration)||duration<1||duration>1440)throw new Error('训练时长应在 1～1440 分钟之间');record.duration_minutes=duration;}
 return record;
}
