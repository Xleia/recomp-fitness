export interface Measurement { date:string; weight?:unknown; waist?:unknown; [key:string]:unknown }
export type MeasurementPoint={date:string;value:number};
const validDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const numeric=(value:unknown,min:number,max:number):number|null=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:null;
export function measurementSeries(records:Measurement[],field:'weight'|'waist'):MeasurementPoint[]{
 const min=field==='weight'?20:30,max=field==='weight'?400:250;
 return records.filter((item)=>validDate(item.date)).flatMap((item)=>{const value=numeric(item[field],min,max);return value===null?[]:[{date:item.date,value}];})
  .sort((a,b)=>a.date.localeCompare(b.date)).slice(-16);
}
export function upsertMeasurement(records:Measurement[],date:string,weight:number|null,waist:number|null):Measurement[]{
 if(!validDate(date))throw new Error('请选择有效日期');
 if(weight===null&&waist===null)throw new Error('至少填写体重或腰围之一');
 if(weight!==null&&numeric(weight,20,400)===null)throw new Error('体重填写不正确');
 if(waist!==null&&numeric(waist,30,250)===null)throw new Error('腰围填写不正确');
 const next=records.map((item)=>({...item}));
 const index=next.findIndex((item)=>item.date===date);
 if(index>=0)next[index]={date,weight,waist};else next.push({date,weight,waist});
 return next;
}
export function removeMeasurementDate(records:Measurement[],date:string):Measurement[]{
 return records.filter((item)=>item.date!==date);
}
