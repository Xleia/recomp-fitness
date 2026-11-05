import { useEffect, useMemo, useState } from 'react';
import { calculateMacros, formatFoodName, loadFoodCatalog, searchFoodCatalog, type Food, type MacroFields } from './catalog';
const tokyoDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
  const get = (type:string) => parts.find((part) => part.type === type)?.value ?? '';
  return get('year') + '-' + get('month') + '-' + get('day');
};
export function NutritionCatalog({onAdd}:{onAdd:(food:Food,amount:number,meal:number,date:string)=>Promise<void>}) {
 const [foods,setFoods]=useState<Food[]>([]),[query,setQuery]=useState(''),[category,setCategory]=useState('');
 const [expanded,setExpanded]=useState(false),[selected,setSelected]=useState<Food|null>(null);
 const [amount,setAmount]=useState('100'),[meal,setMeal]=useState('0'),[date,setDate]=useState(tokyoDate);
 const [status,setStatus]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;void loadFoodCatalog().then((data)=>{if(active)setFoods(data);}).catch((e:unknown)=>{if(active)setError(e instanceof Error?e.message:'食品数据加载失败');});return()=>{active=false;};},[]);
 const categories=useMemo(()=>Array.from(new Set(foods.map((food)=>food.category))),[foods]);
 const matched=searchFoodCatalog(foods,query,category),results=expanded?matched:matched.slice(0,5);
 let macros:MacroFields|null=null;try{if(selected)macros=calculateMacros(selected,Number(amount));}catch{macros=null;}
 async function add(){if(!selected||!macros){setError('请先选择食品并填写有效份量');return;}setError('');setStatus('');try{await onAdd(selected,Number(amount),Number(meal),date);setStatus('已添加到当天餐次并加密保存。');}catch(e){setError(e instanceof Error?e.message:'保存失败，原记录保持不变');}}
 return <section aria-label="食品数据库和营养计算器"><h2>食品数据库与营养计算器</h2>
  <p>离线 MEXT 日本食品成分数据。营养值按每 100 g 展示，并根据你填写的实际份量计算。</p>
  <label>搜索日本食品或中文名称<input value={query} onChange={(e)=>{setQuery(e.target.value);setExpanded(false);}} /></label>
  <label>食品分类<select value={category} onChange={(e)=>{setCategory(e.target.value);setExpanded(false);}}><option value="">全部分类</option>{categories.map((item)=><option value={item} key={item}>{item}</option>)}</select></label>
  {error&&<p role="alert">{error}</p>}
  {foods.length===0?<p>正在加载食品数据库…</p>:results.length===0?<p>没有匹配的食品。</p>:<ul>{results.map((food)=><li key={food.id}><button type="button" className="food-pick" onClick={()=>setSelected(food)}>{formatFoodName(food)} · {food.per100.kcal} kcal / 100 g</button></li>)}</ul>}
  {matched.length>5&&<button type="button" onClick={()=>setExpanded(!expanded)}>{expanded?'收起':'显示更多（'+matched.length+'）'}</button>}
  {selected&&<div className="workout-card"><h3>{formatFoodName(selected)}</h3>
   <label>实际份量（g）<input type="number" min="1" max="10000" step="1" value={amount} onChange={(e)=>setAmount(e.target.value)} /></label>
   <p>{macros?macros.kcal+' kcal · 蛋白质 '+macros.protein+' g · 脂肪 '+macros.fat+' g · 碳水 '+macros.carbs+' g':'请输入有效份量'}</p>
   <label>餐次<select value={meal} onChange={(e)=>setMeal(e.target.value)}>{['早餐','午餐','加餐 / 运动补给','晚餐'].map((x,i)=><option value={i} key={x}>{x}</option>)}</select></label>
   <label>记录日期<input type="date" value={date} onChange={(e)=>setDate(e.target.value)} /></label><button type="button" onClick={()=>void add()}>添加到每日饮食</button>
  </div>}{status&&<p role="status">{status}</p>}</section>;
}
