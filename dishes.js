/* RECOMP finished-dish library, v1: public recipe estimates + encrypted local customizations.
 * Never put measurements or private food journals in this public static file.
 * Ingredient PFC is resolved at runtime from the existing MEXT-derived foods CSV.
 */
(() => {
  'use strict';
  const CATEGORY = {菜:'鸡蛋与蔬菜',肉:'牛肉与猪肉',鸡豆:'鸡肉与豆腐',湘:'湘菜与湖南风味',主食:'主食与粉面',日:'日本常见外食'};
  const FIELDS = ['kcal','protein','fat','carbs'];
  const FOOD_LABELS = {
    '06182':'西红柿','12004':'鸡蛋（可食部分）','06119':'芹菜','06207':'韭菜','06245':'青椒','06153':'洋葱',
    '06312':'生菜','02017':'土豆','06061':'包菜','06263':'西兰花','06267':'菠菜','06065':'黄瓜',
    '06191':'茄子','06223':'大蒜','08039':'香菇（鲜）','06160':'青菜','06116':'西葫芦','06010':'四季豆',
    '11077':'牛腿肉（瘦）','11066':'牛肩里脊（瘦）','11060':'牛肩肉（带脂）','11134':'猪腿肉（瘦）',
    '11123':'猪里脊外侧/猪排肉（带脂）','11129':'猪五花肉','11140':'猪里脊（瘦）','11166':'猪肝',
    '11220':'鸡胸肉（去皮）','11221':'鸡腿肉（带皮）','11224':'鸡腿肉（去皮）','12005':'熟鸡蛋',
    '08007':'木耳（水煮）','06214':'胡萝卜','02035':'淀粉','17007':'酱油','17015':'食醋',
    '03003':'白糖','14006':'食用油（调合油）','14002':'香油','05035':'炒花生',
    '06224':'蒜苔','12020':'皮蛋','06227':'小葱','08016':'白玉菇','06233':'白菜',
    '04032':'老豆腐','04033':'嫩豆腐','04039':'油豆腐/厚揚げ','04040':'油揚げ','01088':'熟米饭',
    '01048':'熟中华面','01115':'干米粉（煮后吸水）','18002':'水饺（标准成品）','18049':'麻婆豆腐（标准成品）',
    '18040':'鸡肉咖喱（标准成品）','18031':'牛丼牛肉浇头（标准成品）','18030':'亲子丼浇头（标准成品）',
    '18054':'唐扬炸鸡（标准成品）','18001':'牛肉咖喱（标准成品）','18053':'御好烧（标准成品）',
    '18028':'猪肉味噌汤（标准成品）','11276':'炸猪排（标准成品）','11195':'日式叉烧肉',
    '17036':'番茄酱','17046':'味噌','17042':'蛋黄酱','17085':'御好烧酱汁','01039':'熟乌冬面',
    '06291':'绿豆芽','06226':'大葱'
  };
  // Explicitly NON-official stand-ins. Affected dishes are always marked "部分调料估算".
  const APPROX = {
    'v-water':{label:'清水（不计算热量）',v:[0,0,0,0]},
    'v-soup':{label:'普通汤底（粗估）',v:[12,0.8,0.6,0.8]},
    'v-beanpaste':{label:'甜面酱/豆瓣调味（粗估）',v:[135,5,2.5,25]},
    'v-tofu-dry':{label:'香干（粗估）',v:[165,17,9,5]},
    'v-chili-dry':{label:'干辣椒（粗估）',v:[330,12,15,55]},
    'v-pickled-beans':{label:'酸豆角（粗估）',v:[35,2,0.5,6]},
    'v-pickled-chili':{label:'剁椒（粗估）',v:[45,1.5,1,8]},
    'v-pickled-veg':{label:'外婆菜（粗估）',v:[65,2,2,10]},
    'v-bacon':{label:'腊肉（粗估）',v:[420,18,38,3]}
  };
  // Outside references are for one *whole dish*, including rice or broth when indicated.
  // These broad ranges are editorial estimates, not restaurant measurements.
  const OUTSIDE_EXAMPLES = {
    '西红柿炒鸡蛋':[300,260,520],'牛肉炒芹菜':[300,260,500],
    '牛肉炒蒜苔':[300,280,520],
    '辣椒炒肉':[250,380,720],'小炒黄牛肉':[250,350,650],
    '宫保鸡丁':[280,400,750],'回锅肉':[240,450,800],
    '麻婆豆腐':[300,260,550],'黄焖鸡':[375,350,650],
    '牛肉米粉（汤粉）':[750,450,800],'湖南炒米粉':[450,550,950],
    '蛋炒饭':[350,550,900],'牛丼':[430,550,800],
    '親子丼':[430,500,800],'生姜焼き定食':[780,700,1050],
    '唐揚げ定食':[740,800,1250],'豚骨ラーメン':[850,650,1000]
  };
  const RECIPE_TEXT = `
西红柿炒鸡蛋|トマトと卵の炒め物|菜|250|270|06182:200 12004:100 14006:8 03003:5
韭菜炒鸡蛋|ニラ玉炒め|菜|200|220|06207:130 12004:100 14006:8
青椒炒鸡蛋|ピーマンと卵の炒め物|菜|200|215|06245:130 12004:100 14006:8
洋葱炒鸡蛋|玉ねぎと卵の炒め物|菜|220|240|06153:170 12004:100 14006:8
蒸鸡蛋羹|中華風茶碗蒸し|菜|200|300|12004:100 v-water:190 17007:5 14002:2
酸辣土豆丝|ジャガイモの細切り炒め|菜|200|225|02017:230 14006:10 17015:15 06223:5
手撕包菜|キャベツの中華炒め|菜|200|240|06061:250 14006:9 06223:5 17007:8
清炒西兰花|ブロッコリーの炒め物|菜|200|220|06263:230 14006:9 06223:5
蒜蓉菠菜|ほうれん草のニンニク炒め|菜|180|190|06267:200 14006:7 06223:8
凉拌黄瓜|たたきキュウリ|菜|200|215|06065:210 14002:4 17015:10 17007:7 06223:5
地三鲜|ジャガイモ・ナス・ピーマンの炒め物|菜|250|280|02017:160 06191:150 06245:110 14006:20 17007:10 03003:4
虎皮青椒|ピーマンの焼き炒め|菜|200|220|06245:230 14006:12 17007:6
蒜蓉生菜|レタスのニンニク炒め|菜|200|215|06312:240 14006:9 06223:7
香菇炒青菜|シイタケと青菜の炒め物|菜|200|235|08039:100 06160:190 14006:8 17007:5
西葫芦炒鸡蛋|ズッキーニの卵炒め|菜|220|245|06116:190 12004:100 14006:8
干煸四季豆|インゲンのピリ辛炒め|菜|200|220|06010:210 11134:35 14006:15 06223:6 17007:8
牛肉炒芹菜|牛肉とセロリの炒め物|肉|250|325|11077:150 06119:180 14006:10 17007:10 06223:5
青椒牛肉丝|牛肉とピーマンの細切り炒め|肉|250|310|11077:160 06245:150 14006:12 17007:9 06223:5
洋葱炒牛肉|牛肉と玉ねぎの炒め物|肉|250|305|11077:170 06153:170 14006:13 17007:8
西兰花炒牛肉|牛肉とブロッコリーの炒め物|肉|250|310|11077:160 06263:200 14006:12 17007:9
青椒肉丝|豚肉とピーマンの細切り炒め|肉|250|305|11134:180 06245:140 14006:13 17007:10
鱼香肉丝|魚香肉絲|肉|250|300|11134:190 06153:60 06214:60 08007:30 14006:16 03003:14 17015:12 17007:10
京酱肉丝|豚肉の甘味噌炒め|肉|200|245|11134:190 06153:40 14006:10 v-beanpaste:40 03003:12
回锅肉|回鍋肉|肉|220|280|11129:180 06061:150 06245:90 14006:12 v-beanpaste:24 17007:8
红烧肉（偏肥）|豚バラの醤油煮込み|肉|150|230|11129:280 03003:24 17007:25 14006:8 v-water:90
红烧排骨（可食肉）|豚スペアリブの醤油煮|肉|180|230|11123:250 17007:20 03003:17 14006:8 v-water:70
土豆炖牛肉|牛肉とジャガイモの煮込み|肉|300|610|11077:200 02017:250 06153:80 06214:70 14006:10 17007:16 v-water:280
番茄炖牛腩|牛肉とトマトの煮込み|肉|300|600|11060:210 06182:300 06153:100 14006:9 17007:12 v-water:200
香干炒肉|干し豆腐と豚肉の炒め物|肉|250|300|11134:150 v-tofu-dry:180 06245:80 14006:14 17007:10
蒜苔炒肉|ニンニクの芽と豚肉の炒め物|肉|250|305|11134:170 06224:200 14006:14 17007:10
木须肉|木須肉|肉|220|300|11134:120 12004:100 06065:90 08007:50 14006:14 17007:10
糖醋里脊|豚ヒレ肉の甘酢あん|肉|180|280|11140:160 02035:45 14006:32 03003:27 17015:20 17036:35
肉末烧茄子|ナスとひき肉の煮炒め|肉|220|300|11134:110 06191:240 14006:22 17007:10 06223:7
芹菜炒肉丝|セロリと豚肉の炒め物|肉|230|300|11134:160 06119:200 14006:11 17007:10
宫保鸡丁|宮保鶏丁|鸡豆|250|330|11220:200 06245:80 06153:60 05035:35 14006:19 03003:13 17007:10 17015:8
黄焖鸡|鶏肉の黄燜煮込み|鸡豆|350|610|11221:260 02017:150 08016:100 06245:90 14006:13 17007:15 v-water:200
辣子鸡|辣子鶏|鸡豆|180|270|11221:250 v-chili-dry:22 14006:32 17007:10 06223:8
香菇滑鸡|シイタケと鶏肉の蒸し煮|鸡豆|230|300|11224:180 08039:130 14006:9 17007:12
红烧鸡腿肉（去骨）|鶏もも肉の醤油煮|鸡豆|220|300|11224:240 06153:70 14006:10 17007:20 03003:8
凉拌鸡丝|蒸し鶏の和え物|鸡豆|220|260|11220:180 06065:100 14002:10 17007:8 17015:10
香煎鸡胸肉|鶏むね肉のソテー|鸡豆|180|165|11220:200 14006:9
番茄炖鸡胸肉|鶏胸肉のトマト煮|鸡豆|300|530|11220:160 06182:270 06153:80 14006:7 v-water:160
鸡肉咖喱（不含米饭）|チキンカレー（ご飯なし）|鸡豆|300|450|18040:450
麻婆豆腐|麻婆豆腐|鸡豆|250|300|18049:300
家常豆腐|家常豆腐|鸡豆|250|300|04039:240 06245:80 06153:80 14006:10 17007:10
肉末豆腐|ひき肉と豆腐の炒め煮|鸡豆|250|340|04032:240 11134:100 14006:12 17007:12
白菜炖豆腐|白菜と豆腐の煮込み|鸡豆|300|520|06233:300 04033:220 14006:5 v-water:140
香煎豆腐|豆腐のソテー|鸡豆|200|220|04032:240 14006:15 17007:8
小葱拌豆腐|豆腐と小ねぎの冷菜|鸡豆|200|210|04033:190 06227:30 14002:4 17007:7
青椒炒鸡胸肉|鶏胸肉とピーマンの炒め物|鸡豆|250|315|11220:200 06245:160 14006:13 17007:10
小炒黄牛肉|湖南風牛肉のピリ辛炒め|湘|250|295|11066:200 06245:150 14006:23 17007:12 06223:8
辣椒炒肉|湖南風豚肉と唐辛子の炒め物|湘|250|300|11123:200 06245:150 14006:19 17007:12 06223:8
农家一碗香|湖南風豚肉と卵の炒め物|湘|230|285|11123:150 12004:100 06245:100 14006:16 17007:12
攸县香干炒肉|湖南風干し豆腐と豚肉の炒め物|湘|250|310|v-tofu-dry:200 11123:150 06245:110 14006:16 17007:12
酸豆角炒肉末|漬けインゲンと豚ひき肉の炒め物|湘|250|315|11134:150 v-pickled-beans:180 14006:15 06223:8 17007:10
擂辣椒皮蛋|焼き唐辛子とピータンの和え物|湘|200|235|06245:200 12020:90 14002:11 17007:10
剁椒蒸鸡|刻み唐辛子の蒸し鶏|湘|250|325|11224:260 v-pickled-chili:35 14006:12 17007:10
剁椒炒鸡蛋|刻み唐辛子と卵の炒め物|湘|200|230|12004:130 v-pickled-chili:70 14006:12 17007:7
爆炒猪肝|豚レバーの強火炒め|湘|220|260|11166:190 06245:110 14006:18 17007:10
外婆菜炒肉末|湖南風漬け野菜と豚ひき肉炒め|湘|250|300|11134:150 v-pickled-veg:160 14006:15 17007:10
蒜苔炒腊肉|ニンニクの芽と干し肉の炒め物|湘|200|265|v-bacon:160 06224:160 14006:14 17007:8
香辣鸡丁|湖南風鶏肉のピリ辛炒め|湘|220|275|11221:190 06245:100 14006:18 17007:10 06223:6
蛋炒饭|卵チャーハン|主食|300|340|01088:300 12004:75 14006:14 17007:10 06227:20
牛肉炒饭|牛肉チャーハン|主食|350|390|01088:310 11077:110 12004:50 14006:15 17007:12
鸡肉盖饭|鶏肉丼|主食|450|460|01088:220 11224:180 06153:90 14006:10 17007:12 03003:7
卤肉饭（含米饭）|ルーローハン|主食|380|415|01088:220 11129:110 12005:50 14006:8 17007:17 03003:10
牛肉米粉（汤粉）|牛肉入りライスヌードルスープ|主食|700|720|01115:90 11077:110 06233:65 14006:9 17007:12 v-soup:420
湖南杀猪粉|湖南風豚肉とレバーの米粉スープ|主食|700|750|01115:90 11134:80 11166:55 06227:30 14006:13 17007:14 v-soup:470
湖南肉丝清汤粉|湖南風豚肉入り米粉スープ|主食|680|730|01115:85 11134:90 06233:100 14006:8 17007:10 v-soup:450
湖南炒米粉|湖南風焼きビーフン|主食|440|470|01115:115 11134:120 12004:50 06245:80 14006:20 17007:12
西红柿鸡蛋面|トマトと卵の麺|主食|750|780|01048:250 06182:200 12004:100 14006:9 17007:10 v-soup:300
肉末拌面|ひき肉和え麺|主食|500|540|01048:320 11134:130 14006:13 17007:20 06153:60 v-beanpaste:25
炸酱面|ジャージャー麺|主食|480|510|01048:300 11129:100 v-beanpaste:75 06065:90 14006:13 17007:12
牛肉炒面|牛肉焼きそば|主食|480|490|01048:310 11077:150 06245:80 14006:18 17007:15
水饺（猪肉白菜）|豚肉と白菜の水餃子|主食|200|220|18002:220
馄饨汤|ワンタンスープ|主食|550|590|18002:140 v-soup:400 06227:12 14002:5
鸡肉咖喱饭|チキンカレーライス|主食|430|470|01088:220 18040:250
牛腩汤面|牛肉煮込みラーメン|主食|820|860|01048:300 11060:160 06233:90 14006:12 17007:15 v-soup:450
牛丼|牛丼|日|430|430|01088:220 18031:210
親子丼|親子丼|日|420|430|01088:210 18030:220
生姜焼き定食|豚の生姜焼き定食|日|780|790|01088:230 11123:170 06061:130 14006:12 17007:14 03003:9 v-soup:180
唐揚げ定食|鶏の唐揚げ定食|日|740|760|01088:220 18054:230 06061:130 v-soup:180
カツ丼|カツ丼|日|500|520|01088:220 11276:160 12004:65 06153:90 17007:12 03003:9
カレーライス|カレーライス|日|470|480|01088:230 18001:240
オムライス|オムライス|日|440|450|01088:250 12004:130 11224:70 14006:15 17036:45 06153:60
醤油ラーメン|醤油ラーメン|日|850|900|01048:280 11195:80 12005:50 06227:35 14006:9 17007:30 v-soup:430
豚骨ラーメン|豚骨ラーメン|日|850|900|01048:300 11129:95 12005:50 06227:30 14006:17 v-soup:450
味噌ラーメン|味噌ラーメン|日|900|940|01048:310 11129:85 06291:110 14006:15 17046:45 v-soup:430
きつねうどん|きつねうどん|日|700|750|01039:320 04040:50 06227:30 17007:15 03003:9 v-soup:400
焼きそば|焼きそば|日|520|540|01048:330 11134:120 06061:120 14006:17 17085:40
お好み焼き（酱汁蛋黄酱）|お好み焼き（ソース・マヨ付き）|日|390|410|18053:340 17042:20 17085:30
焼き餃子|焼き餃子|日|180|195|18002:180 14006:5
とん汁（不含米饭）|豚汁（ご飯なし）|日|300|320|18028:320
とんかつ定食|とんかつ定食|日|670|690|01088:220 11276:180 06061:110 v-soup:180
牛肉炒蒜苔|牛肉とニンニクの芽の炒め物|肉|250|325|11077:150 06224:180 14006:10 17007:10 06223:5
`;
  const dishes = RECIPE_TEXT.trim().split('\n').map((line,i) => {
    const [name,ja,group,refText,yieldText,ingredientText] = line.trim().split('|');
    const parts = ingredientText.trim().split(/\s+/).map(pair => {
      const [code,mass] = pair.split(':');
      return {code,grams:Number(mass)};
    });
    return {id:'dish-'+String(i+1).padStart(3,'0'),name,ja,category:CATEGORY[group],
      refGrams:Number(refText),yieldGrams:Number(yieldText),ingredients:parts};
  });
  const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;};
  const element=id=>document.getElementById(id);
  const fmt=n=>(Math.round((Number(n)||0)*10)/10).toLocaleString('zh-CN',{maximumFractionDigits:1});
  const round=n=>Math.round(n*100)/100;
  const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
  const btn=(s,handler,cls='secondary')=>{const x=node('button',cls,s);x.type='button';x.addEventListener('click',handler);return x;};
  let csvMap=null, fetchPromise=null, fetchError='';
  let started=false, tab='foods', mode='home', activeDish=null, filterCategory='',query='',maxVisible=12;
  let draft=null, searchWrap=null, dishPanel=null, originals=[], statusEl=null, listEl=null, editorEl=null, starredEl=null;

  function privateLib(){
    if(typeof state==='undefined'||!state)throw Error('请先解锁私人记录');
    if(!state.foodLibrary||typeof state.foodLibrary!=='object')state.foodLibrary={};
    const l=state.foodLibrary;
    if(!l.dishRecipes||typeof l.dishRecipes!=='object'||Array.isArray(l.dishRecipes))l.dishRecipes={};
    if(!Array.isArray(l.dishFavorites))l.dishFavorites=[];
    return l;
  }
  function savedRecipe(id){return privateLib().dishRecipes[id]||null;}
  function ingredientRef(code){
    const fallback=APPROX[code];
    if(fallback)return {code,label:fallback.label,macro:{kcal:fallback.v[0],protein:fallback.v[1],fat:fallback.v[2],carbs:fallback.v[3]},approx:true};
    const v=csvMap?.get(code);
    return v?{code,label:FOOD_LABELS[code]||v.name,macro:v.macro,approx:false}:null;
  }
  async function loadIngredients(){
    if(csvMap)return csvMap;
    if(fetchPromise)return fetchPromise;
    fetchPromise=fetch('./foods-mext-2023.csv').then(async response=>{
      if(!response.ok)throw Error('食品数据文件无法读取：HTTP '+response.status);
      const text=await response.text();
      if(!text.startsWith('name,category,food_code,'))throw Error('食品成分表格式不正确');
      const rows=text.split(/\r?\n/).slice(1).filter(Boolean).map(s=>s.split(','));
      const m=new Map();
      for(const r of rows)if(r.length===8&&/^\d{5}$/.test(r[2])){
        const v=r.slice(3,7).map(Number);
        if(v.every(n=>Number.isFinite(n)&&n>=0))m.set(r[2],{name:r[0],macro:{kcal:v[0],protein:v[1],fat:v[2],carbs:v[3]}});
      }
      if(m.size<2500)throw Error('食品成分表未完整加载');
      const missing=[...new Set(dishes.flatMap(d=>d.ingredients.map(x=>x.code)))].filter(code=>!APPROX[code]&&!m.has(code));
      if(missing.length)throw Error('配方引用的食品代码不存在：'+missing.join(','));
      csvMap=m;fetchError='';return m;
    }).catch(err=>{fetchPromise=null;fetchError=err.message;throw err;});
    return fetchPromise;
  }
  function defaultDraft(dish){
    const saved=savedRecipe(dish.id),isValid=saved&&Array.isArray(saved.ingredients)&&saved.ingredients.length>0&&saved.ingredients.length<=40;
    let ing=dish.ingredients.map((p,i)=>({code:p.code,grams:p.grams}));
    let yieldG=dish.yieldGrams;
    if(isValid&&saved.ingredients.every(p=>Object.hasOwn(FOOD_LABELS,p.code)||Object.hasOwn(APPROX,p.code))){
      if(saved.ingredients.every(p=>Number.isFinite(p.grams)&&p.grams>=0&&p.grams<=5000))ing=saved.ingredients.map(p=>({code:p.code,grams:p.grams}));
      if(Number.isFinite(saved.yieldGrams)&&saved.yieldGrams>=30&&saved.yieldGrams<=10000)yieldG=saved.yieldGrams;
    }
    return {dishId:dish.id,ingredients:ing,yieldGrams:yieldG,amount:dish.refGrams,externalAmount:OUTSIDE_EXAMPLES[dish.name]?.[0]||dish.refGrams,oil:'normal',meal:(typeof window.Nutrition?.getActiveMealIndex === 'function' ? window.Nutrition.getActiveMealIndex() : 1)};
  }
  function calculateHome(dish,overrides){
    if(!csvMap)throw Error('食品营养数据库尚未加载成功');
    const values={kcal:0,protein:0,fat:0,carbs:0};
    for(const x of overrides.ingredients){
      const f=ingredientRef(x.code);
      if(!f||!Number.isFinite(x.grams)||x.grams<0||x.grams>5000)throw Error('食材数据或重量不正确');
      for(const k of FIELDS)values[k]+=f.macro[k]*x.grams/100;
    }
    if(!Number.isFinite(overrides.yieldGrams)||overrides.yieldGrams<30||overrides.yieldGrams>10000)throw Error('成品重量必须在30～10000g之间');
    const per100=Object.fromEntries(FIELDS.map(k=>[k,round(values[k]*100/overrides.yieldGrams)]));
    return {total:values,per100,serving:Object.fromEntries(FIELDS.map(k=>[k,round(per100[k]*overrides.amount/100)]))};
  }
  function outsideBounds(dish){
    const preset=OUTSIDE_EXAMPLES[dish.name];
    if(preset)return {grams:preset[0],low:preset[1],high:preset[2],grounding:'经验范围'};
    const home=calculateHome(dish,{...draft,ingredients:dish.ingredients,yieldGrams:dish.yieldGrams});
    const kcal=home.per100.kcal*dish.refGrams/100;
    return {grams:dish.refGrams,low:Math.round(kcal*0.8/10)*10,high:Math.round(kcal*1.6/10)*10,grounding:'配方推导范围'};
  }
  function calculateOutside(dish){
    if(!Number.isFinite(draft.externalAmount)||draft.externalAmount<10||draft.externalAmount>3000)throw Error('外食份量应在10～3000g之间');
    const base=outsideBounds(dish);
    const factor=draft.externalAmount/base.grams;
    // Very approximate oil correction: fewer or more retained grams of oil per baseline serving.
    const oilAdjust=draft.oil==='low'?-5:draft.oil==='high'?8:0;
    const low=Math.max(0,round((base.low+oilAdjust*8.86)*factor));
    const high=Math.max(low,round((base.high+oilAdjust*8.86)*factor));
    const midpoint=(low+high)/2;
    const homemade=calculateHome(dish,{ingredients:dish.ingredients,yieldGrams:dish.yieldGrams,amount:draft.externalAmount});
    const kcalDiff=midpoint-homemade.serving.kcal;
    const macros={kcal:round(midpoint),protein:round(homemade.serving.protein),
      fat:round(Math.max(0,homemade.serving.fat+kcalDiff*0.65/9)),
      carbs:round(Math.max(0,homemade.serving.carbs+kcalDiff*0.35/4))};
    return {base,low,high,midpoint,macros,per100:Object.fromEntries(FIELDS.map(k=>[k,round(macros[k]*100/draft.externalAmount)])),
      lowPer100:round(low*100/draft.externalAmount),highPer100:round(high*100/draft.externalAmount)};
  }
  function validEntry(){
    if(!activeDish||!draft||!csvMap)throw Error('请先选好菜品并加载食品数据库');
    if(!Number.isFinite(draft.meal)||draft.meal<0||draft.meal>3)throw Error('请选择餐次');
    let grams,per100,source,meta;
    if(mode==='home'){
      if(!Number.isFinite(draft.amount)||draft.amount<1||draft.amount>5000)throw Error('实际食用量应在1～5000g之间');
      grams=draft.amount;
      const calc=calculateHome(activeDish,draft);
      per100=calc.per100;
      source='家庭标准配方估算（日本食品成分表原料值；成品熟重为假设或自填）';
      meta={id:activeDish.id,ja:activeDish.ja,mode:'home',yieldGrams:draft.yieldGrams,
        recipe:draft.ingredients.map(x=>({code:x.code,grams:x.grams}))};
    }else{
      const calc=calculateOutside(activeDish);
      grams=draft.externalAmount;per100=calc.per100;
      source='外食参考估算：按参考区间中点记入热量，PFC由配方粗估；并非商家实测';
      meta={id:activeDish.id,ja:activeDish.ja,mode:'outside',oil:draft.oil,
        lowPer100:calc.lowPer100,highPer100:calc.highPer100};
    }
    if(FIELDS.some(k=>!Number.isFinite(per100[k])||per100[k]<0||per100[k]>(k==='kcal'?1000:100)))throw Error('这份配方计算结果超出合理范围，请调整食材或成品重量');
    return {name:activeDish.name+(mode==='home'?'（自制）':'（外食估算）'),grams,mealIndex:draft.meal,per100,meta,source};
  }
  function metricGrid(vals){
    const host=node('div','dish-metrics');
    for(const [k,title,unit] of [['kcal','热量','kcal'],['protein','蛋白质','g'],['fat','脂肪','g'],['carbs','碳水','g']]){
      const tile=node('div','dish-metric');tile.append(node('small','',title),node('strong','',fmt(vals[k])+' '+unit));host.append(tile);
    }
    return host;
  }
  function labelField(title,type,value,onInput,min,max){
    const label=node('label','dish-field');label.append(node('span','',title));
    const input=node('input');input.type=type;input.inputMode=type==='number'?'decimal':'text';input.value=value;
    if(type==='number'){input.min=String(min);input.max=String(max);input.step='any';}
    input.addEventListener('input',()=>onInput(input));label.append(input);return {label,input};
  }
  function selectField(title,options,value,onChange){
    const lab=node('label','dish-field');lab.append(node('span','',title));const s=node('select');
    for(const [v,name] of options){const o=node('option','',name);o.value=v;s.append(o);}
    s.value=String(value);s.addEventListener('change',()=>onChange(s.value));lab.append(s);
    return {label:lab,select:s};
  }
  function activeFavorite(){return !!activeDish&&privateLib().dishFavorites.includes(activeDish.id);}
  function ensureSelected(){
    if(!activeDish)return false;
    if(!draft||draft.dishId!==activeDish.id)draft=defaultDraft(activeDish);
    return true;
  }
  function renderCards(){
    if(!listEl||!started)return;
    const q=normalize(query);
    const list=dishes.filter(d=>(!filterCategory||d.category===filterCategory)&&(!q||normalize(d.name).includes(q)||normalize(d.ja).includes(q)));
    listEl.replaceChildren();
    statusEl.textContent=`${list.length} 道符合条件 · 菜品库共 ${dishes.length} 道 · 所有营养均为参考估算`;
    if(!list.length){listEl.append(node('div','empty','未找到相符的菜品。可改用单食材计算器，或输入其他菜名。'));return;}
    const favorites=privateLib().dishFavorites;
    for(const d of list.slice(0,maxVisible)){
      const card=node('div','dish-result');
      const textBox=node('div','dish-result-copy');
      const head=node('strong','',d.name+(favorites.includes(d.id)?' ★':''));
      textBox.append(head,node('small','',d.ja),node('small','',d.category));
      if(csvMap){
        try{
          if(mode==='home'){
            const ref=calculateHome(d,{ingredients:d.ingredients,yieldGrams:d.yieldGrams,amount:d.refGrams});
            textBox.append(node('small','dish-energy',`每100g ≈${fmt(ref.per100.kcal)} kcal · 参考${d.refGrams}g ≈${Math.round(ref.serving.kcal)} kcal`));
          }else{
            const guess=OUTSIDE_EXAMPLES[d.name]||(()=>{const ref=calculateHome(d,{ingredients:d.ingredients,yieldGrams:d.yieldGrams,amount:d.refGrams});return [d.refGrams,Math.round(ref.serving.kcal*0.8/10)*10,Math.round(ref.serving.kcal*1.6/10)*10];})();
            textBox.append(node('small','dish-energy',`参考${guess[0]}g ≈${guess[1]}–${guess[2]} kcal`));
          }
        }catch(err){textBox.append(node('small','','食材数据待确认'));}
      }
      const selectButton=btn(activeDish?.id===d.id?'已选中 · 修改':'选择计算',()=>selectDish(d.id),'small-btn');
      card.append(textBox,selectButton);listEl.append(card);
    }
    const page=node('div','dish-page');
    if(list.length>maxVisible)page.append(btn('显示更多（剩余'+(list.length-maxVisible)+'道）',()=>{maxVisible+=12;renderCards();}));
    if(maxVisible>12)page.append(btn('↑ 收起至前12道',()=>{maxVisible=12;renderCards();listEl.scrollIntoView({block:'start',behavior:'smooth'});}));
    listEl.append(page);
  }
  function renderFavorites(){
    if(!starredEl)return;
    starredEl.replaceChildren();
    const f=privateLib().dishFavorites;
    if(!f.length){starredEl.append(node('small','','还没有收藏的菜品。打开菜品详情即可收藏。'));return;}
    for(const id of f){const d=dishes.find(x=>x.id===id);if(d)starredEl.append(btn('★ '+d.name,()=>selectDish(d.id),'dish-favorite-chip'));}
  }
  function refreshDetailReadout(host,amountInput,yieldInput,ingredientRows){
    host.replaceChildren();
    try{
      const result=calculateHome(activeDish,draft);
      host.append(node('span','dish-summary-hint','本次食用量 '+fmt(draft.amount)+'g；每100g成品约 '+fmt(result.per100.kcal)+' kcal'),metricGrid(result.serving));
      const warn=draft.ingredients.some(x=>Boolean(APPROX[x.code]));
      host.append(node('small','dish-disclaimer',warn?'部分食材采用粗估值；食物总量与出锅重量请按实际修正。':'原料引用食品成分表；熟重、油量、食材保留率仍会影响实际结果。'));
      ingredientRows.forEach(({line,code,input})=>{
        const r=ingredientRef(code);const g=Number(input.value);line.textContent=r&&Number.isFinite(g)?fmt(r.macro.kcal*g/100)+' kcal':'— kcal';
      });
      amountInput.removeAttribute('aria-invalid');yieldInput.removeAttribute('aria-invalid');
    }catch(err){host.append(node('div','warning',err.message));}
  }
  function renderHomeEditor(container){
    const note=node('p','dish-disclaimer','家庭模式：食材按净重/可食部分计，主食含熟米饭。可修改所有原料、食用油与成品重量；默认熟重仅为估计。');
    container.append(note);
    const controls=node('div','dish-two-cols');
    const a=labelField('本次吃了多少（g）','number',draft.amount,x=>{
      draft.amount=x.value===''?NaN:Number(x.value);refreshDetailReadout(stats,a.input,y.input,rows);
    },1,5000);
    const y=labelField('整道菜出锅重量（g）','number',draft.yieldGrams,x=>{
      draft.yieldGrams=x.value===''?NaN:Number(x.value);refreshDetailReadout(stats,a.input,y.input,rows);
    },30,10000);
    controls.append(a.label,y.label);container.append(controls);
    container.append(node('h3','dish-subtitle','食材与调味料（可以编辑）'));
    const rowsBox=node('div','dish-ingredients'),rows=[];
    container.append(rowsBox);
    const extraWrap=node('div','dish-add-ingredient');
    const picker=selectField('增加一种食材',Object.entries(FOOD_LABELS).map(([code,name])=>[code,name]).concat(Object.entries(APPROX).map(([code,v])=>[code,v.label])),
      '14006',()=>{});
    extraWrap.append(picker.label,btn('＋ 加入原料',()=>{
      if(draft.ingredients.length>=40){notify('每个自定义菜谱最多40项原料',true);return;}
      draft.ingredients.push({code:picker.select.value,grams:10});renderEditor();
    },'small-btn'));container.append(extraWrap);
    const stats=node('div','dish-calculation');container.append(stats);
    function makeRows(){
      rowsBox.replaceChildren();rows.length=0;
      draft.ingredients.forEach((entry,i)=>{
        const ref=ingredientRef(entry.code);
        const row=node('div','dish-ingredient-row');
        const name=node('div','dish-ingredient-name');name.append(node('strong','',ref?.label||entry.code),node('small','',entry.code.startsWith('v-')?'经验估算':'食品成分表 '+entry.code));
        const input=node('input');input.type='number';input.inputMode='decimal';input.step='any';input.min='0';input.max='5000';input.value=entry.grams;
        input.setAttribute('aria-label',ref?.label+'克数');
        const energy=node('small','dish-ingredient-calories');
        input.addEventListener('input',()=>{entry.grams=input.value===''?NaN:Number(input.value);refreshDetailReadout(stats,a.input,y.input,rows);});
        const remove=btn('×',()=>{if(draft.ingredients.length<=1){notify('至少保留一项食材',true);return;}draft.ingredients.splice(i,1);renderEditor();},'dish-remove');
        remove.setAttribute('aria-label','删除食材：'+(ref?.label||entry.code));
        row.append(name,input,energy,remove);rowsBox.append(row);rows.push({line:energy,code:entry.code,input});
      });
    }
    makeRows();refreshDetailReadout(stats,a.input,y.input,rows);
    const controlButtons=node('div','dish-actions');
    controlButtons.append(btn('🔒 保存为我的配方',async()=>{
      try{
        calculateHome(activeDish,draft);
        const l=privateLib();if(Object.keys(l.dishRecipes).length>=120&&!l.dishRecipes[activeDish.id])throw Error('个人菜谱最多保存120道');
        l.dishRecipes[activeDish.id]={yieldGrams:draft.yieldGrams,
          ingredients:draft.ingredients.map(p=>({code:p.code,grams:p.grams}))};
        await persist();notify('我的配方已加密保存，以后优先使用这套用量');
      }catch(err){showError(err);}
    }));
    controlButtons.append(btn('恢复标准配方',()=>{
      draft.ingredients=activeDish.ingredients.map(p=>({...p}));draft.yieldGrams=activeDish.yieldGrams;
      renderEditor();notify('当前编辑已恢复标准值；已保存的私人配方不会被覆盖');
    }));
    if(savedRecipe(activeDish.id))controlButtons.append(btn('删除已保存配方',async()=>{
      if(!confirm('删除这道菜保存的私人配方？标准配方仍保留。'))return;
      try{delete privateLib().dishRecipes[activeDish.id];await persist();notify('私人配方已删除');renderEditor();}catch(err){showError(err);}
    }));
    container.append(controlButtons);
  }
  function renderOutsideEditor(container){
    container.append(node('p','dish-disclaimer','外食模式：按典型份量和用油差异给出宽范围，无法知道餐馆实际配方。记录采用区间中点，并明确标记为估算。'));
    const controls=node('div','dish-two-cols');
    const current=outsideBounds(activeDish);
    const portion=selectField('常见份量',[
      ['small','小份（约'+Math.round(current.grams*0.7)+'g）'],
      ['normal','普通份（约'+current.grams+'g）'],
      ['large','大份（约'+Math.round(current.grams*1.35)+'g）']
    ],'normal',v=>{draft.externalAmount=v==='small'?Math.round(current.grams*0.7):v==='large'?Math.round(current.grams*1.35):current.grams;amount.input.value=draft.externalAmount;update();});
    const amount=labelField('实际吃的重量（g）','number',draft.externalAmount,x=>{draft.externalAmount=x.value===''?NaN:Number(x.value);portion.select.value='';update();},10,3000);
    const oil=selectField('餐馆用油程度',[['low','少油'],['normal','普通'],['high','多油']],draft.oil,v=>{draft.oil=v;update();});
    controls.append(portion.label,amount.label,oil.label);container.append(controls);
    const stats=node('div','dish-outside-summary');container.append(stats);
    function update(){
      stats.replaceChildren();
      try{
        const r=calculateOutside(activeDish);
        const d=node('div','dish-range');
        d.append(node('small','','参考热量区间'),node('strong','',`${Math.round(r.low)} – ${Math.round(r.high)} kcal`));
        stats.append(d,node('small','dish-center-label','每日饮食记录将采用中间估算值 '+Math.round(r.midpoint)+' kcal'),metricGrid(r.macros));
        stats.append(node('small','dish-disclaimer','蛋白质/脂肪/碳水为参考配方推估，不可视为实测。少油/多油仅按基础份量约 −5g / +8g 留存油进行简化调整。'));
        amount.input.removeAttribute('aria-invalid');
      }catch(err){stats.append(node('div','warning',err.message));amount.input.setAttribute('aria-invalid','true');}
    }
    update();
  }
  function renderEditor(){
    if(!editorEl)return;
    editorEl.replaceChildren();
    if(!activeDish){editorEl.append(node('div','empty','从下方选择一道菜，查看家庭配方或外食热量估算。'));return;}
    if(!csvMap){editorEl.append(node('div','warning',fetchError||'正在加载离线食品成分表，请稍后重试。'));return;}
    ensureSelected();
    const heading=node('div','dish-detail-head');
    const title=node('div');title.append(node('h2','',activeDish.name),node('small','',activeDish.ja+' · '+activeDish.category));
    const favorite=btn(activeFavorite()?'★ 已收藏':'☆ 收藏',async()=>{
      try{
        const l=privateLib(),id=activeDish.id;
        l.dishFavorites=l.dishFavorites.includes(id)?l.dishFavorites.filter(x=>x!==id):[...l.dishFavorites,id].slice(-120);
        await persist();renderFavorites();renderCards();renderEditor();
      }catch(err){showError(err);}
    },'small-btn');heading.append(title,favorite);editorEl.append(heading);
    if(mode==='home')renderHomeEditor(editorEl);else renderOutsideEditor(editorEl);
    const meal=selectField('加入哪一餐', [['0','早餐'],['1','午餐'],['2','加餐 / 运动补给'],['3','晚餐']],draft.meal,v=>{draft.meal=Number(v);});
    editorEl.append(meal.label);
    editorEl.append(btn('＋ 将这道菜加入当天饮食',()=>{
      try{
        const item=validEntry();
        if(!window.Nutrition?.addDishToDay)throw Error('菜品添加功能尚未准备好，请确认已更新 nutrition.js');
        window.Nutrition.addDishToDay(item);
      }catch(err){showError(err);}
    },'primary full'));
    editorEl.append(node('small','dish-disclaimer','添加后作为一条菜品记录，不会重复登记菜里的各项食材；返回「每日饮食」后，请点击「加密保存当天饮食」。'));
  }
  function selectDish(id){
    const selected=dishes.find(d=>d.id===id);if(!selected)return;
    activeDish=selected;draft=defaultDraft(selected);renderEditor();renderCards();
    editorEl.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function setMode(m){
    mode=m==='outside'?'outside':'home';
    element('dish-mode-home').classList.toggle('active',mode==='home');
    element('dish-mode-outside').classList.toggle('active',mode==='outside');
    if(activeDish&&draft&&mode==='outside'&&(!Number.isFinite(draft.externalAmount)||draft.externalAmount<=0))draft.externalAmount=outsideBounds(activeDish).grams;
    renderCards();renderEditor();
  }
  function setTab(t){
    tab=t==='dishes'?'dishes':'foods';
    element('dish-tab-foods').classList.toggle('active',tab==='foods');
    element('dish-tab-dishes').classList.toggle('active',tab==='dishes');
    dishPanel.hidden=tab!=='dishes';
    for(const el of originals)el.hidden=tab==='dishes';
    if(tab==='dishes')refresh();
  }
  function refresh(){
    if(!started||!state)return;
    element('dish-date-text').textContent='正在为 '+foodDate+' 添加菜品 · 数据只在保存当天饮食后写入加密记录';
    renderFavorites();renderCards();renderEditor();
    if(!csvMap){
      statusEl.textContent='正在加载食品成分表…';
      void loadIngredients().then(()=>{if(state&&tab==='dishes'){renderCards();renderEditor();}})
        .catch(err=>{if(state&&tab==='dishes'){fetchError=err.message;statusEl.textContent='食品成分表载入失败：'+err.message;renderEditor();}});
    }
  }
  function init(){
    if(started)return;
    const back=element('nutrition-back'),screen=element('screen-library');
    if(!back||!screen||!window.Nutrition)return;
    originals=Array.from(screen.querySelectorAll(':scope > article.panel'));
    searchWrap=node('div','dish-switch');
    const foodTab=btn('🥦 单食材数据库',()=>setTab('foods'),'dish-switch-btn active');foodTab.id='dish-tab-foods';
    const dishTab=btn('🍳 成品菜数据库',()=>setTab('dishes'),'dish-switch-btn');dishTab.id='dish-tab-dishes';
    searchWrap.append(foodTab,dishTab);
    dishPanel=node('section','dish-main');dishPanel.hidden=true;dishPanel.id='dish-main';
    const title=node('div','dish-heading');
    title.append(node('h2','','成品菜 · 双模式热量查询'),node('p','', '家庭配方按原材料计算；外食模式提供不确定区间。'));
    dishPanel.append(title,node('small','dish-date',''));dishPanel.lastChild.id='dish-date-text';
    const modes=node('div','dish-switch dish-mode-switch');
    const home=btn('家庭标准配方',()=>setMode('home'),'dish-switch-btn active');home.id='dish-mode-home';
    const outside=btn('外食参考估算',()=>setMode('outside'),'dish-switch-btn');outside.id='dish-mode-outside';
    modes.append(home,outside);dishPanel.append(modes);
    const searchPanel=node('div','panel dish-search');
    const search=labelField('菜名搜索（中文 / 日文）','text','',x=>{query=x.value;maxVisible=12;renderCards();});
    search.input.placeholder='牛肉炒芹菜、辣椒炒肉、親子丼';searchPanel.append(search.label);
    const category=selectField('菜品分类',[['','全部分类'],...Object.values(CATEGORY).map(x=>[x,x])],'',v=>{filterCategory=v;maxVisible=12;renderCards();});
    searchPanel.append(category.label);statusEl=node('small','dish-found','');searchPanel.append(statusEl);
    const favoriteSection=node('div','dish-saved');favoriteSection.append(node('h3','','★ 收藏的菜品'));
    starredEl=node('div','dish-favorites');favoriteSection.append(starredEl);searchPanel.append(favoriteSection);
    dishPanel.append(searchPanel);
    const detail=node('article','panel dish-detail');detail.append(node('h3','','菜品详情与营养计算'));
    editorEl=node('div','dish-editor');detail.append(editorEl);dishPanel.append(detail);
    const searchResults=node('article','panel dish-list');searchResults.append(node('h3','','菜品列表'));
    listEl=node('div','dish-list-items');searchResults.append(listEl);dishPanel.append(searchResults);
    dishPanel.append(node('p','privacy-footnote','数据说明：菜品标准配方基于日本食品标准成分表原料数值及自定烹饪假设；部分调味品采用粗估。外食热量区间是宽泛参考值，并非餐厅发布的数据。熟重、吸油、汤汁和实际份量会导致偏差。我的菜谱、收藏及当天记录只保存在本机加密保险库。'));
    back.after(searchWrap,dishPanel);
    started=true;
    setTab('foods');
  }
  const originalRender=window.Nutrition?.renderLibrary;
  if(originalRender){window.Nutrition.renderLibrary=function(...args){originalRender.apply(window.Nutrition,args);if(started){
    if(tab==='dishes')refresh();
  }};}
  const originalClear=window.Nutrition?.clearSession;
  if(originalClear){window.Nutrition.clearSession=function(...args){const v=originalClear.apply(window.Nutrition,args);activeDish=null;draft=null;if(editorEl)editorEl.replaceChildren();return v;};}
  document.addEventListener('DOMContentLoaded',init);
  window.RecompDishes={dishes,refresh,checkData:()=>({count:dishes.length,categories:Object.values(CATEGORY),loaded:!!csvMap})};
})();