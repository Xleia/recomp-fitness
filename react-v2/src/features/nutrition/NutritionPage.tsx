import { useState } from 'react';
import type { NutritionDay } from './selectors';
import { NutritionHistory } from './NutritionHistory';
import { NutritionCatalog } from './NutritionCatalog';
import type { Food } from './catalog';
import { NutritionManual } from './NutritionManual';
export function NutritionPage({days,nutrition,onAdd,onSaveManual}:{days:NutritionDay[];nutrition:Record<string,unknown>;onAdd:(food:Food,amount:number,meal:number,date:string)=>Promise<void>;onSaveManual:(date:string,entries:Array<Record<string,unknown>>,lunch:number|null)=>Promise<void>}) {
 const [view,setView]=useState<'history'|'catalog'|'manual'>('history');
 return <section><div className="export-actions">
  <button onClick={()=>setView('history')} aria-pressed={view==='history'}>饮食记录</button>
  <button onClick={()=>setView('catalog')} aria-pressed={view==='catalog'}>食品数据库 / 添加食物</button><button onClick={()=>setView('manual')} aria-pressed={view==='manual'}>手动营养记录</button>
 </div>{view==='history'?<NutritionHistory days={days}/>:view==='catalog'?<NutritionCatalog onAdd={onAdd}/>:<NutritionManual nutrition={nutrition} onSave={onSaveManual}/ >}</section>;
}
