import { useState } from 'react';
import type { Measurement } from './selectors';
import { measurementSeries } from './selectors';
function tokyoDate(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(x:string)=>p.find(y=>y.type===x)?.value??'';return get('year')+'-'+get('month')+'-'+get('day');}
function Trend({rows,field,label,unit}:{rows:Measurement[];field:'weight'|'waist';label:string;unit:string}){
 const points=measurementSeries(rows,field),values=points.map(x=>x.value);
 if(!points.length)return <section><h3>{label}</h3><p>尚无记录</p></section>;
 const low=Math.min(...values),high=Math.max(...values),pad=Math.max((high-low)*.15,1),bottom=125,top=20;
 const coords=points.map((p,i)=>{const x=points.length===1?170:20+i*320/(points.length-1);const y=bottom-(p.value-(low-pad))/(high-low+2*pad)*(bottom-top);return{x,y,p};});
 return <section><h3>{label}</h3><svg viewBox="0 0 360 155" role="img" aria-label={label+'趋势图'}>
  <line x1="15" x2="345" y1={bottom} y2={bottom} stroke="#cbd5df"/><polyline fill="none" stroke="#146c5a" strokeWidth="3" points={coords.map(c=>c.x+','+c.y).join(' ')}/>
  {coords.map((c,i)=><g key={c.p.date+i}><circle cx={c.x} cy={c.y} r="4" fill="#146c5a"/><text x={c.x} y={c.y-8} textAnchor="middle" fontSize="10">{c.p.value} {unit}</text></g>)}
 </svg><p>{points[0].date} — {points[points.length-1].date}</p></section>;
}
export function ProgressPage({measurements,onSave,onDelete}:{measurements:Measurement[];onSave:(date:string,weight:number|null,waist:number|null)=>Promise<void>;onDelete:(date:string)=>Promise<void>}){
 const [date,setDate]=useState(tokyoDate),[weight,setWeight]=useState(''),[waist,setWaist]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function save(){setError('');setMessage('');try{await onSave(date,weight.trim()===''?null:Number(weight),waist.trim()===''?null:Number(waist));setMessage('体测记录已加密保存。');}catch(e){setError(e instanceof Error?e.message:'保存失败，原数据未更改');}}
 return <section aria-label="体重与腰围记录"><h2>体测与趋势</h2>
  <div className="workout-card"><h3>记录体重与腰围</h3>
   <label>日期<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label>体重（kg）<input type="number" min="20" max="400" step="0.01" value={weight} onChange={e=>setWeight(e.target.value)}/></label>
   <label>腰围（cm）<input type="number" min="30" max="250" step="0.1" value={waist} onChange={e=>setWaist(e.target.value)}/></label>
   <button type="button" onClick={()=>void save()}>保存体测</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  </div>
  <div className="progress-charts"><Trend rows={measurements} field="weight" label="体重趋势" unit="kg"/><Trend rows={measurements} field="waist" label="腰围趋势" unit="cm"/></div>
  <h3>历史记录</h3>{measurements.length===0?<p>尚无体测记录。</p>:<ul>{[...measurements].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)).sort((a,b)=>b.date.localeCompare(a.date)).map((row,i)=><li key={row.date+i}>
   <button type="button" className="food-pick" onClick={()=>{setDate(row.date);setWeight(typeof row.weight==='number'?String(row.weight):'');setWaist(typeof row.waist==='number'?String(row.waist):'');}}>{row.date} · 体重 {typeof row.weight==='number'?row.weight:'—'} kg · 腰围 {typeof row.waist==='number'?row.waist:'—'} cm</button>
   <button type="button" onClick={()=>{if(window.confirm('删除 '+row.date+' 的体测记录？'))void onDelete(row.date).catch(e=>setError(e instanceof Error?e.message:'删除失败'));}}>删除</button>
  </li>)}</ul>}
 </section>;
}
