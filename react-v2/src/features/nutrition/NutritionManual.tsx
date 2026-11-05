import{useEffect,useState}from'react';
const meals=['早餐','午餐','加餐 / 运动补给','晚餐'],fields=[['kcal','热量（kcal）'],['protein','蛋白质（g）'],['fat','脂肪（g）'],['carbs','碳水（g）']] as const;
const lunches=[['猪肉蔬菜定食（图片款）',780,38,29,85],['卤肉饭＋卤蛋＋蔬菜',820,30,36,94],['猪肉定食（非油炸）',760,40,26,90],['牛丼＋鸡蛋＋沙拉',750,32,26,96],['拉面＋鸡蛋／肉',850,32,34,103],['荞麦面＋蛋白质配菜',650,35,18,87],['乌冬面＋鸡肉／鸡蛋',680,33,16,100],['便利店饭团＋鸡胸＋鸡蛋＋沙拉',720,46,19,91]] as const;
type Entry={kcal:number|null;protein:number|null;fat:number|null;carbs:number|null;note:string};
function blank():Entry{return{kcal:null,protein:null,fat:null,carbs:null,note:''};}
function validDate(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===s;}
export function parseManualAmount(value:string,key:string):number|null{if(value.trim()==='')return null;const n=Number(value),max=key==='kcal'?10000:1000;if(!Number.isFinite(n)||n<0||n>max)throw new Error('请检查营养数字');return n;}
export function NutritionManual({nutrition,onSave}:{nutrition:Record<string,unknown>;onSave:(date:string,entries:Entry[],lunch:number|null)=>Promise<void>}){
 const[date,setDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date())),[entries,setEntries]=useState<Entry[]>(Array.from({length:4},blank)),[lunch,setLunch]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const saved=nutrition[date]&&typeof nutrition[date]==='object'?nutrition[date] as Record<string,unknown>:{};
  const rows=Array.isArray(saved.entries)?saved.entries:[];
  setEntries(Array.from({length:4},(_,i)=>{const x=rows[i]&&typeof rows[i]==='object'?rows[i] as Record<string,unknown>:{};
    return{kcal:typeof x.kcal==='number'?x.kcal:null,protein:typeof x.protein==='number'?x.protein:null,fat:typeof x.fat==='number'?x.fat:null,carbs:typeof x.carbs==='number'?x.carbs:null,note:typeof x.note==='string'?x.note:''};}));
  setLunch(Number.isInteger(saved.lunch)?String(saved.lunch):'');
 },[date,nutrition]);
 function setField(i:number,key:keyof Entry,value:unknown){setEntries(xs=>xs.map((x,j)=>j===i?{...x,[key]:value}:x));}
 async function save(){setError('');setMessage('');try{if(!validDate(date))throw new Error('请选择有效日期');const clean=entries.map(x=>({kcal:parseManualAmount(x.kcal===null?'':String(x.kcal),'kcal'),protein:parseManualAmount(x.protein===null?'':String(x.protein),'protein'),fat:parseManualAmount(x.fat===null?'':String(x.fat),'fat'),carbs:parseManualAmount(x.carbs===null?'':String(x.carbs),'carbs'),note:x.note.slice(0,200)}));await onSave(date,clean,lunch===''?null:Number(lunch));setMessage('每日饮食记录已加密保存。');}catch(e){setError(e instanceof Error?e.message:'保存失败，原数据保持不变');}}
 function applyLunch(){if(lunch===''){setError('请先选择外食估算');return;}const item=lunches[Number(lunch)];if(!item)return;setEntries(xs=>xs.map((x,i)=>i===1?{...x,kcal:item[1],protein:item[2],fat:item[3],carbs:item[4]}:x));setError('');}
 return <section aria-label="手动营养记录"><h2>每日营养记录</h2><label>记录日期<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
 {meals.map((meal,i)=><article className="workout-card" key={meal}><details><summary>{meal}</summary><div className="meal-grid">
  {fields.map(([key,label])=><label key={key}>{label}<input type="number" min="0" max={key==='kcal'?10000:1000} step={key==='kcal'?'1':'0.1'} value={entries[i][key]??''} onChange={e=>setField(i,key,e.target.value===''?null:Number(e.target.value))}/></label>)}
  <label>备注<input maxLength={200} value={entries[i].note} onChange={e=>setField(i,'note',e.target.value)}/></label>
 </div></details></article>)}
 <article className="workout-card"><h3>午餐估算参考</h3><label>常见外食<select value={lunch} onChange={e=>setLunch(e.target.value)}><option value="">不选择</option>{lunches.map((x,i)=><option value={i} key={x[0]}>{x[0]} · 约 {x[1]} kcal</option>)}</select></label><button type="button" onClick={applyLunch}>填入午餐估算（可修改）</button></article>
 <button type="button" onClick={()=>void save()}>保存手动饮食记录</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</section>;
}
