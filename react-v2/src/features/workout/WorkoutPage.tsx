import{useEffect,useState}from'react';
import type{WorkoutRecord}from'../../types/state';import type{TrainingPlan}from'../plans/plan-data';import{repsLabel,restLabel}from'../plans/plan-data';
import{completedWorkload,formatWorkload,listWorkoutRecords}from'./selectors';import{buildWorkoutRecord,makeWorkoutDraft,planDayForDate,trainingWeek,type WorkoutDraftItem}from'./workout-editor';
function today(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=(k:string)=>p.find(x=>x.type===k)?.value??'';return g('year')+'-'+g('month')+'-'+g('day');}
export function WorkoutPage({workouts,plan,startDate,onSave}:{workouts:Record<string,WorkoutRecord>;plan:TrainingPlan|null;startDate:unknown;onSave:(record:WorkoutRecord)=>Promise<void>}){
 const[date,setDate]=useState(today),[draft,setDraft]=useState<WorkoutDraftItem[]>([]),[note,setNote]=useState(''),[duration,setDuration]=useState(''),[status,setStatus]=useState(''),[error,setError]=useState('');
 const day=planDayForDate(plan,date,startDate),weekday=new Date(date+'T12:00:00Z').getUTCDay(),week=plan?trainingWeek(startDate,date,plan.duration_weeks):1,saved=workouts[date];
 useEffect(()=>{setDraft(makeWorkoutDraft(saved,day));setNote(typeof saved?.note==='string'?saved.note:'');setDuration(typeof saved?.duration_minutes==='number'?String(saved.duration_minutes):'');},[date,plan,workouts]);
 function change(i:number,j:number,key:string,value:unknown){setDraft(xs=>xs.map((x,k)=>k===i?{...x,sets:x.sets.map((s,n)=>n===j?{...s,[key]:value}:s)}:x));}
 async function save(){setError('');setStatus('');try{const record=buildWorkoutRecord({date,day:weekday,template:day,plan,week,existing:saved,items:draft,note,durationMinutes:duration.trim()===''?null:Number(duration)});await onSave(record);setStatus('训练记录已加密保存。');}catch(e){setError(e instanceof Error?e.message:'保存失败，原记录保持不变');}}
 const history=listWorkoutRecords(workouts);
 return <section aria-label="训练记录与历史"><h2>训练记录</h2><label>训练日期<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
 {day&&<p>{day.name} · 第 {week} / {plan?.duration_weeks??'—'} 周 · 保存时只记录你填写的实际完成数据。</p>}
 {!day&&!saved&&<p>该日期没有计划安排；可从历史训练选择已有日期查看记录。</p>}
 {draft.length===0?<p>{saved?'该日期没有训练动作。':'当前没有可记录动作。'}</p>:draft.map((item,i)=>{const planned=day?.exercises.find(x=>x.exercise_id===item.exercise_id);return <article className="workout-card" key={item.exercise_id??i}><details><summary>{item.name} · {item.sets.length} 组 · 已完成 {item.sets.filter(s=>s.done===true).length} 组</summary>
 <label>动作名称<input value={item.name} onChange={e=>setDraft(xs=>xs.map((x,k)=>k===i?{...x,name:e.target.value}:x))}/></label>
 {planned&&<p>计划参考：{planned.sets} 组 × {repsLabel(planned.reps)}；休息 {restLabel(planned.rest_seconds)}</p>}
 {item.sets.map((set,j)=><div className="set-row" key={j}><strong>第 {j+1} 组</strong>
 <label>实际重量（kg）<input type="number" min="0" max="1000" step="0.1" value={set.w??''} onChange={e=>change(i,j,'w',e.target.value===''?null:Number(e.target.value))}/></label>
 <label>实际次数<input type="number" min="0" max="1000" step="1" value={set.r??''} onChange={e=>change(i,j,'r',e.target.value===''?null:Number(e.target.value))}/></label>
 <label>RPE<input type="number" min="1" max="10" step="0.5" value={typeof set.rpe==='number'?set.rpe:''} onChange={e=>change(i,j,'rpe',e.target.value===''?null:Number(e.target.value))}/></label>
 <label>RIR<input type="number" min="0" max="20" step="1" value={typeof set.rir==='number'?set.rir:''} onChange={e=>change(i,j,'rir',e.target.value===''?null:Number(e.target.value))}/></label>
 <label><input type="checkbox" checked={set.done===true} onChange={e=>change(i,j,'done',e.target.checked)}/> 已完成</label>
 <button type="button" onClick={()=>setDraft(xs=>xs.map((x,k)=>k===i?{...x,sets:x.sets.filter((_,n)=>n!==j)}:x))}>删除组</button></div>)}
 <button type="button" onClick={()=>setDraft(xs=>xs.map((x,k)=>k===i?{...x,sets:[...x.sets,{w:null,r:null,done:false}]}:x))}>增加一组</button>
 </details></article>;})}
 {draft.length>0&&<article className="workout-card"><label>训练时长（分钟）<input type="number" min="1" max="1440" step="1" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>训练备注<textarea maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label><button type="button" onClick={()=>void save()}>保存实际训练记录</button></article>}
 {status&&<p role="status">{status}</p>}{error&&<p role="alert">{error}</p>}
 <h3>历史训练</h3>{history.length===0?<p>还没有训练记录。</p>:history.slice(0,30).map(({key,record})=>{const w=completedWorkload(record);return <button className="food-pick" type="button" key={key} onClick={()=>setDate(String(record.date))}>{record.date} · {record.title||'训练记录'} · 完成 {w.completedSets} 组 · {formatWorkload(w.volumeKg)} kg</button>;})}
 </section>;
}
