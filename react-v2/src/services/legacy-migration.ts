import type {RecompState} from '../types/state';
export const LEGACY_STORAGE_KEY='recomp8week';
const dateOk=(x:unknown):x is string=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const obj=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};
export function migrateLegacyState(raw:string,today:string):RecompState{
 const old=JSON.parse(raw) as Record<string,unknown>;if(!old||typeof old!=='object'||Array.isArray(old))throw Error('旧版记录数据异常');
 const state:RecompState={schema:2,profile:{created:today},settings:{start:today},measurements:[],workouts:{},nutrition:{},legacyHistory:[]};
 const measures=Array.isArray(old.measures)?old.measures.slice(0,1000):[];
 for(const value of measures){const m=obj(value);if(!dateOk(m.date))continue;const weight=Number(m.weight),waist=Number(m.waist);state.measurements.push({date:m.date,weight:Number.isFinite(weight)&&weight>0?weight:null,waist:Number.isFinite(waist)&&waist>0?waist:null});}
 const workouts=Array.isArray(old.workouts)?old.workouts.slice(-1500):[];
 const legacyHistory:Array<Record<string,unknown>>=[];
 for(const value of workouts){const w=obj(value);if(!dateOk(w.date))continue;const title=typeof w.title==='string'?w.title.slice(0,100):'旧版训练',completed=Number(w.completed);legacyHistory.push({date:w.date,title,sets:Number.isFinite(completed)?Math.max(0,completed):0});if(Array.isArray(w.entries)){const day=Number(w.day);state.workouts['legacy-'+w.date+'-'+legacyHistory.length]={date:w.date,day:Number.isInteger(day)&&day>=0&&day<=6?day:undefined,title,items:w.entries.slice(0,40).map(entry=>{const e=obj(entry);return{name:typeof e.exercise==='string'?e.exercise.slice(0,100):'',sets:Array.isArray(e.sets)?e.sets.slice(0,20).map(set=>{const x=obj(set),weight=Number(x.w),reps=Number(x.r);return{w:Number.isFinite(weight)?weight:null,r:Number.isFinite(reps)?reps:null,done:x.done===true};}):[]};})};}}
 state.legacyHistory=legacyHistory;
 const food=obj(old.food);
 for(const value of Object.values(food).slice(0,1500)){const item=obj(value);if(!dateOk(item.date))continue;const number=(x:unknown)=>{const n=Number(x);return Number.isFinite(n)?Math.max(0,n):0};state.nutrition[item.date]={date:item.date,entries:[{kcal:number(item.kcal),protein:number(item.protein),fat:0,carbs:0,note:typeof item.memo==='string'?item.memo.slice(0,300):'旧版当日合计'},...Array.from({length:3},()=>({kcal:0,protein:0,fat:0,carbs:0,note:''}))],lunch:null};}
 return state;
}
