import { useState } from 'react';
import type { NutritionDay } from './selectors';
import { NutritionHistory } from './NutritionHistory';
import { NutritionCatalog } from './NutritionCatalog';
import type { Food } from './catalog';
export function NutritionPage({days,onAdd}:{days:NutritionDay[];onAdd:(food:Food,amount:number,meal:number,date:string)=>Promise<void>}) {
 const [view,setView]=useState<'history'|'catalog'>('history');
 return <section><div className="export-actions">
  <button onClick={()=>setView('history')} aria-pressed={view==='history'}>饮食记录</button>
  <button onClick={()=>setView('catalog')} aria-pressed={view==='catalog'}>食品数据库 / 添加食物</button>
 </div>{view==='history'?<NutritionHistory days={days}/>:<NutritionCatalog onAdd={onAdd}/>}</section>;
}
