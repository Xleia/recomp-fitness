/* RECOMP food library: public MEXT-derived catalog, private records remain in the encrypted vault. */
(() => {
  'use strict';
  const FIELDS = ['kcal', 'protein', 'fat', 'carbs'];
  const CATEGORY_CN = {'穀類':'谷物','いも及びでん粉類':'薯类','砂糖及び甘味類':'糖类','豆類':'豆类','種実類':'坚果种子','野菜類':'蔬菜','果実類':'水果','きのこ類':'菌菇','藻類':'海藻','魚介類':'鱼贝类','肉類':'肉类','卵類':'蛋类','乳類':'乳制品','油脂類':'油脂','菓子類':'点心','し好飲料類':'饮料','調味料及び香辛料類':'调味料','調理済み流通食品類':'即食食品'};
  const ALIASES = {
    '01004':'燕麦 燕麦片 麦片 oats oatmeal',
    '01083':'生米 大米 精白米 米',
    '01088':'熟米饭 白米饭 米饭 白饭 rice',
    '01085':'糙米饭 玄米饭',
    '01153':'发芽糙米',
    '12004':'鸡蛋 全蛋 生鸡蛋 蛋 egg',
    '12005':'水煮蛋 熟鸡蛋 鸡蛋 boiled egg',
    '13003':'牛奶 全脂牛奶 普通牛奶 鲜牛奶 milk',
    '13005':'低脂牛奶',
    '13025':'无糖酸奶 原味酸奶 yogurt',
    '07107':'香蕉 banana 去皮香蕉',
    '07148':'苹果 去皮苹果',
    '07176':'苹果 带皮苹果',
    '07006':'牛油果 鳄梨 avocado',
    '11220':'鸡胸肉 去皮 生肉 chicken breast',
    '11288':'鸡胸肉 去皮 烤熟 chicken breast cooked',
    '11219':'鸡胸肉 带皮 生肉',
    '11214':'老母鸡鸡胸肉 去皮生',
    '11213':'老母鸡鸡胸肉 带皮生',
    '10130':'银鲑 三文鱼 鲑鱼 salmon',
    '10253':'金枪鱼 赤身 tuna',
    '10086':'鲣鱼 生鱼',
    '04032':'木棉豆腐 老豆腐 北豆腐',
    '04033':'绢豆腐 嫩豆腐',
    '04052':'无糖豆浆 豆奶 豆乳',
    '04053':'调制豆浆',
    '06263':'西兰花 生 broccoli',
    '06264':'西兰花 水煮 broccoli cooked',
    '06267':'菠菜 生',
    '06268':'菠菜 水煮',
    '06153':'洋葱 生',
    '06214':'胡萝卜 生 去皮',
    '06182':'番茄 西红柿',
    '06183':'小番茄 圣女果',
    '06065':'黄瓜',
    '06312':'生菜 莴苣 lettuce',
    '02017':'土豆 马铃薯 生 去皮',
    '02019':'土豆 马铃薯 水煮',
    '02006':'红薯 甘薯 生 去皮',
    '02008':'烤红薯',
    '14001':'橄榄油 olive oil',
    '14002':'芝麻油 香油',
    '05040':'杏仁 烤杏仁 无盐'
  };
  const POPULAR = ['01004','13003','12004','07107','01088','11220','04032','04033','13025','06263','06182','14001','02006','07148'];
  // MEXT's composition table is per 100 g. Use mL only for specified known-density foods.
  const ML_FACTOR = {'13003':1.03,'13005':1.03,'04052':1.01};
  const ITEM_UNITS = {'12004':[{unit:'个',label:'个（约50g可食部分）',factor:50}],'07107':[{unit:'根',label:'根（约100g去皮）',factor:100}]};
  const byId = id => document.getElementById(id);
  function translated(food) {
    if(!food.code)return {zh:'',complete:true};
    return window.FoodZh?.translate(food.name,food.code,food.category)||{zh:'',complete:false};
  }
  function titleFor(food) {
    const t=translated(food);
    return t.zh || food.name;
  }
  function nameBlock(host,food) {
    const t=translated(food);
    host.append(node('strong','',t.zh||food.name));
    if(t.zh)host.append(node('small','nutrition-japanese','日文：'+food.name+(t.complete?'':' · 部分译名待补充')));
    else if(food.code)host.append(node('small','nutrition-japanese','日文原名 · 中文译名待补充'));
  }
  const node = (tag, className, value) => {
    const e=document.createElement(tag);
    if(className)e.className=className;
    if(value!==undefined)e.textContent=String(value);
    return e;
  };
  const button = (value, handler, className='small-btn') => {
    const b=node('button',className,value);b.type='button';b.addEventListener('click',handler);return b;
  };
  const norm = x => String(x||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
  const fmt = n => (Math.round((Number(n)||0)*10)/10).toLocaleString('zh-CN',{maximumFractionDigits:1});
  const rounding = n => Math.round(n*100)/100;
  const copy = obj => structuredClone(obj);
  let publicFoods=null, loadPromise=null, loadError='', selected=[], drafts=new Map(), manualDrafts=new Map(), mealIndex=0, resultLimit=18;

  function library() {
    if(!state)throw Error('请先解锁私人记录');
    if(!state.foodLibrary || typeof state.foodLibrary!=='object')state.foodLibrary={};
    const l=state.foodLibrary;
    if(!Array.isArray(l.customFoods))l.customFoods=[];
    if(!Array.isArray(l.favorites))l.favorites=[];
    if(!Array.isArray(l.templates))l.templates=[];
    return l;
  }
  function validateMacro(n,key) {
    const max=key==='kcal'?1000:100;
    return Number.isFinite(n)&&n>=0&&n<=max;
  }
  function publicFromCsv(row) {
    if(row.length!==8||!/^\d{5}$/.test(row[2]))return null;
    const values=row.slice(3,7).map(Number);
    if(!values.every((x,i)=>validateMacro(x,FIELDS[i])))return null;
    return {id:'mext-'+row[2],code:row[2],name:row[0],category:row[1],
      baseUnit:'g',per100:{kcal:values[0],protein:values[1],fat:values[2],carbs:values[3]},
      source:'日本食品标准成分表（八订）增补2023年 · 第三方整理'};
  }
  async function loadCatalog() {
    if(publicFoods)return publicFoods;
    if(loadPromise)return loadPromise;
    loadPromise=fetch('./foods-mext-2023.csv').then(async resp=>{
      if(!resp.ok)throw Error('食品数据文件加载失败（HTTP '+resp.status+'）');
      const str=await resp.text(),lines=str.split(/\r?\n/);
      if(!lines[0].startsWith('name,category,food_code,'))throw Error('食品数据格式不正确');
      const records=lines.slice(1).filter(Boolean).map(line=>publicFromCsv(line.split(','))).filter(Boolean);
      if(records.length<2500)throw Error('食品数据库不完整');
      publicFoods=records;loadError='';return records;
    }).catch(err=>{loadError=err.message;loadPromise=null;throw err;});
    return loadPromise;
  }
  function allFoods() {return [...library().customFoods,...(publicFoods||[])];}
  function findFood(id) {return allFoods().find(f=>f.id===id);}
  function unitsFor(item) {
    const opts=[{unit:item.baseUnit||'g',label:item.baseUnit||'g',factor:1}];
    if(item.baseUnit==='g'&&ML_FACTOR[item.code])opts.push({unit:'ml',label:'ml（按密度换算）',factor:ML_FACTOR[item.code]});
    if(item.baseUnit==='g'&&ITEM_UNITS[item.code])opts.push(...ITEM_UNITS[item.code]);
    return opts;
  }
  function recompute(row) {
    const amount=Number(row.amount);
    const multiplier=(Number.isFinite(amount)&&amount>=0?amount:0)*(Number(row.factor)||1)/100;
    row.snap={};
    for(const key of FIELDS)row.snap[key]=rounding((Number(row.per100?.[key])||0)*multiplier);
    return row;
  }
  function makeRow(food,amount=100) {
    return recompute({id:food.id,code:food.code||'',name:String(food.name).slice(0,140),
      source:String(food.source).slice(0,140),category:food.category||'',baseUnit:food.baseUnit||'g',
      per100:copy(food.per100),amount,unit:food.baseUnit||'g',factor:1});
  }
  function totals(rows) {
    const out={kcal:0,protein:0,fat:0,carbs:0};
    for(const row of rows||[])for(const key of FIELDS)out[key]+=Number(row?.snap?.[key])||0;
    for(const key of FIELDS)out[key]=rounding(out[key]);
    return out;
  }
  function dayDraft(date) {
    if(!drafts.has(date)){
      const saved=state.nutrition[date]?.foodItems;
      const result=Array.from({length:4},(_,i)=>Array.isArray(saved?.[i])?copy(saved[i]).slice(0,100):[]);
      drafts.set(date,result);
    }
    return drafts.get(date);
  }
  function draftTotals(date) {return totals(dayDraft(date).flat());}
  function captureManual() {
    if(!state || currentScreen!=='food')return;
    const entries=[];
    for(let i=0;i<4;i++){
      const entry={};
      for(const key of FIELDS){
        const input=document.querySelector('[data-meal="'+i+'"][data-nutrient="'+key+'"]');
        entry[key]=input?.value??'';
      }
      entry.note=document.querySelector('[data-meal="'+i+'"][data-nutrient="note"]')?.value??'';
      entries.push(entry);
    }
    const lunch=byId('lunch-selector')?.value??'';
    manualDrafts.set(foodDate,{entries,lunch});
  }
  function manualForDay(date) {return manualDrafts.get(date)||null;}
  function savedManual(date) {manualDrafts.delete(date);}
  function collectRows(date) {
    const data=dayDraft(date);
    for(const rows of data){
      if(rows.length>100)throw Error('单餐最多记录100项食物');
      for(const r of rows){
        if(!Number.isFinite(Number(r.amount))||Number(r.amount)<=0||Number(r.amount)>10000)throw Error('食物重量应在0～10000之间');
        if(!FIELDS.every(k=>validateMacro(Number(r.per100?.[k]),k)))throw Error('食品营养数据异常');
        recompute(r);
      }
    }
    return copy(data);
  }
  function mealTotals(date,index){return totals(dayDraft(date)[index]);}
  function clearSession() {
    drafts.clear();manualDrafts.clear();selected=[];mealIndex=0;resultLimit=18;
    ['nutrition-results','nutrition-selected','nutrition-templates','nutrition-favorites'].forEach(id=>{const x=byId(id);if(x)x.replaceChildren();});
  }
  function savedDay(date){drafts.delete(date);}
  function showSummary() {
    const sum=totals(selected);
    for(const k of FIELDS){const e=byId('nutrition-total-'+k);if(e)e.textContent=fmt(sum[k])+(k==='kcal'?' kcal':' g');}
    byId('nutrition-selected-count').textContent=selected.length+' 项';
  }
  function resultInfo(food) {
    return '每100'+(food.baseUnit||'g')+' · '+fmt(food.per100.kcal)+' kcal / 蛋白 '+fmt(food.per100.protein)+'g / 脂肪 '+fmt(food.per100.fat)+'g / 碳水 '+fmt(food.per100.carbs)+'g';
  }
  function addSelection(food) {
    if(selected.length>=50){notify('单次计算最多添加50项',true);return;}
    selected.push(makeRow(food));renderSelected();notify('已加入计算清单');
  }
  function renderSelected() {
    const host=byId('nutrition-selected');host.replaceChildren();
    if(!selected.length)host.append(node('div','empty','搜索食物后点击「加入计算」，可同时计算多项食物。'));
    selected.forEach((row,i)=>{
      const wrap=node('div','nutrition-line');
      nameBlock(wrap,row);
      wrap.append(node('small','',row.source));
      const controls=node('div','nutrition-controls');
      const amount=node('input','nutrition-amount');amount.type='number';amount.inputMode='decimal';amount.min='0.1';amount.max='10000';amount.step='any';amount.value=row.amount;amount.setAttribute('aria-label',row.name+'数量');
      const unit=node('select','nutrition-unit');
      unitsFor(row).forEach(o=>{const opt=node('option','',o.label);opt.value=o.unit;unit.append(opt);});
      unit.value=row.unit;
      const cals=node('span','nutrition-kcal',fmt(row.snap.kcal)+' kcal');
      amount.addEventListener('input',()=>{
        row.amount=amount.value===''?0:Number(amount.value);
        recompute(row);cals.textContent=fmt(row.snap.kcal)+' kcal';showSummary();
      });
      unit.addEventListener('change',()=>{
        const originalMass=(Number(row.amount)||0)*(Number(row.factor)||1);
        const u=unitsFor(row).find(o=>o.unit===unit.value);
        if(!u)return;
        row.unit=u.unit;row.factor=u.factor;row.amount=rounding(originalMass/u.factor);
        recompute(row);renderSelected();
      });
      controls.append(amount,unit,cals,button('移除',()=>{selected.splice(i,1);renderSelected();}));
      wrap.append(controls);host.append(wrap);
    });
    showSummary();
  }
  function populateCategories() {
    const el=byId('nutrition-category'),prev=el.value;
    el.replaceChildren();const all=node('option','','全部分类');all.value='';el.append(all);
    const categories=new Set(allFoods().map(x=>x.category));
    [...categories].sort((a,b)=>a.localeCompare(b,'ja')).forEach(cat=>{
      const o=node('option','',(CATEGORY_CN[cat]||cat)+' · '+cat);o.value=cat;el.append(o);
    });
    el.value=categories.has(prev)?prev:'';
  }
  function rank(food,q) {
    const name=norm(food.name),alias=norm(ALIASES[food.code]||''),chinese=norm(translated(food).zh);
    if(!q)return library().favorites.includes(food.id)?-200:POPULAR.indexOf(food.code)>=0?POPULAR.indexOf(food.code)-100:100;
    if(name===q||alias===q||chinese===q)return -100;
    if(name.startsWith(q)||alias.startsWith(q)||chinese.startsWith(q))return -60;
    return name.indexOf(q)>=0?-30:chinese.indexOf(q)>=0?-25:alias.indexOf(q)>=0?-20:0;
  }
  function renderResults() {
    const host=byId('nutrition-results');host.replaceChildren();
    const q=norm(byId('nutrition-query').value),category=byId('nutrition-category').value;
    let matches=allFoods().filter(f=>{
      if(category&&f.category!==category)return false;
      return !q||norm(f.name).includes(q)||norm(f.category).includes(q)||norm(f.brand).includes(q)||norm(ALIASES[f.code]||'').includes(q)||norm(translated(f).zh).includes(q);
    });
    matches.sort((a,b)=>rank(a,q)-rank(b,q));
    const total=matches.length;
    byId('nutrition-result-count').textContent=total+' 条结果'+(publicFoods?' · 离线库 '+publicFoods.length+' 条':'');
    if(loadError)host.append(node('div','warning','官方来源整理库暂不可用：'+loadError+'；仍可使用自定义食品。'));
    if(!total){host.append(node('div','empty',publicFoods?'未找到匹配食品，可以添加自定义品牌食品。':'正在加载食物库…'));return;}
    for(const food of matches.slice(0,resultLimit)){
      const card=node('div','nutrition-result');
      nameBlock(card,food);
      if(food.brand)card.append(node('small','',food.brand));
      card.append(node('small','',resultInfo(food)));
      card.append(node('small','',food.category+' · '+(food.code?'食品编号 '+food.code:'用户自行录入')));
      const actions=node('div','nutrition-result-actions');
      const star=library().favorites.includes(food.id);
      actions.append(button(star?'★ 已收藏':'☆ 收藏',async()=>{
        const l=library();l.favorites=star?l.favorites.filter(x=>x!==food.id):[...new Set([...l.favorites,food.id])].slice(-300);
        try{await persist();renderResults();renderFavorites();}catch(err){showError(err);}
      }),button('＋ 加入计算',()=>addSelection(food)));
      card.append(actions);host.append(card);
    }
    const actions=node('div','nutrition-pagination');
    if(total>resultLimit)actions.append(button('显示更多（还剩 '+(total-resultLimit)+' 条）',()=>{resultLimit+=18;renderResults();},'secondary'));
    if(resultLimit>18)actions.append(button('↑ 收起（仅显示前18条）',()=>{resultLimit=18;renderResults();byId('nutrition-results').scrollIntoView({block:'start',behavior:'smooth'});},'secondary'));
    host.append(actions);
  }
  function renderFavorites() {
    const host=byId('nutrition-favorites');host.replaceChildren();
    const fav=library().favorites.map(id=>findFood(id)).filter(Boolean);
    if(!fav.length){host.append(node('small','','暂无收藏食品。'));return;}
    fav.slice(0,30).forEach(food=>{
      const line=node('div','nutrition-mini');
      const label=node('span');nameBlock(label,food);line.append(label,button('加入计算',()=>addSelection(food)));
      host.append(line);
    });
  }
  function renderTemplates() {
    const host=byId('nutrition-templates');host.replaceChildren();
    const templates=library().templates||[];
    if(!templates.length){host.append(node('small','','常吃的组合可在上方计算完成后保存成模板。'));return;}
    templates.forEach(t=>{
      const line=node('div','nutrition-template');
      const heading=node('div');
      heading.append(node('strong','',t.name),node('small','',t.rows.length+' 项食物 · '+fmt(totals(t.rows).kcal)+' kcal'));
      line.append(heading);
      const actions=node('div','nutrition-result-actions');
      actions.append(button('载入计算器',()=>{
        selected=copy(t.rows).map(recompute);mealIndex=t.mealIndex||0;
        byId('nutrition-meal').value=String(mealIndex);renderSelected();notify('已载入常用餐');
      }));
      actions.append(button('删除',async()=>{
        if(!confirm('删除常用餐「'+t.name+'」？'))return;
        library().templates=library().templates.filter(x=>x.id!==t.id);
        try{await persist();renderTemplates();}catch(err){showError(err);}
      }));
      line.append(actions);host.append(line);
    });
  }
  function renderMeals() {
    const current=dayDraft(foodDate);
    const boxes=[...document.querySelectorAll('#meal-list .meal')];
    boxes.forEach((box,i)=>{
      box.querySelectorAll(':scope > .nutrition-day-items').forEach(x=>x.remove());
      const wrap=node('div','nutrition-day-items');
      const heading=node('div','nutrition-day-header');
      heading.append(node('strong','','食材明细 · '+current[i].length+' 项'),
        button('＋ 从食物库添加',()=>openForMeal(i)));
      wrap.append(heading);
      if(!current[i].length)wrap.append(node('small','','尚未添加明细；下方原有输入框可用于手工补录。'));
      current[i].forEach((row,j)=>{
        const line=node('div','nutrition-day-row');
        const info=node('div');
        nameBlock(info,row);
        if(row.dishMeta?.ja)info.append(node('small','nutrition-japanese','日文：'+row.dishMeta.ja));
        if(row.dishMeta?.mode==='outside')info.append(node('small','nutrition-japanese dish-record-range',dishRange(row)));
        info.append(node('small','nutrition-day-calories',row.unit+' · '+fmt(row.snap?.kcal)+' kcal'));
        const input=node('input','nutrition-day-amount');input.type='number';input.inputMode='decimal';input.step='any';input.min='0.1';input.max='10000';input.value=row.amount;
        input.setAttribute('aria-label',row.name+'数量（'+row.unit+'）');
        input.addEventListener('input',()=>{
          row.amount=input.value===''?0:Number(input.value);
          recompute(row);
          info.querySelector('.nutrition-day-calories').textContent=row.unit+' · '+fmt(row.snap.kcal)+' kcal';
          const range=info.querySelector('.dish-record-range');if(range)range.textContent=dishRange(row);
          updateTotals();
        });
        input.addEventListener('change',()=>renderMeals());
        line.append(info,input,button('×',()=>{current[i].splice(j,1);renderMeals();updateTotals();}));
        wrap.append(line);
      });
      if(current[i].length)wrap.append(node('small','','明细小计 '+fmt(totals(current[i]).kcal)+' kcal；修改数量后保存当天饮食才会加密写入。'));
      const grid=box.querySelector('.meal-grid');
      grid?.before(wrap);
      if(grid && !box.querySelector('.nutrition-manual-label'))grid.before(node('small','nutrition-manual-label','手动补录（额外营养，避免与食材明细重复输入）'));
    });
  }
  function openForMeal(index) {
    captureManual();
    mealIndex=index;selected=[];byId('nutrition-meal').value=String(index);
    navigate('library');
  }
  function renderLibrary() {
    if(!state)return;
    byId('nutrition-current-date').textContent=foodDate+' · 新增食材在「每日饮食」保存后写入加密保险库';
    byId('nutrition-meal').value=String(mealIndex);
    renderSelected();populateCategories();renderResults();renderTemplates();renderFavorites();
    if(!publicFoods)loadCatalog().then(()=>{
      if(state&&currentScreen==='library'){populateCategories();renderResults();renderFavorites();}
    }).catch(()=>{if(state&&currentScreen==='library')renderResults();});
  }
  function addToDay() {
    if(!selected.length)throw Error('请先添加至少一种食物');
    const index=Number(byId('nutrition-meal').value);
    if(!Number.isInteger(index)||index<0||index>3)throw Error('请选择餐次');
    const rows=selected.map(r=>copy(recompute(r)));
    for(const r of rows)if(!Number.isFinite(Number(r.amount))||r.amount<=0||r.amount>10000)throw Error('请检查食物数量');
    if(dayDraft(foodDate)[index].length+rows.length>100)throw Error('单餐最多记录100项食物');
    dayDraft(foodDate)[index].push(...rows);
    mealIndex=index;selected=[];navigate('food');
    notify('已加入食材明细。请点击「加密保存当天饮食」完成保存');
  }
  // RECOMP DISH INTEGRATION V1: A dish is one snapshot row, not a duplicate list of ingredients.
  function addDishToDay(input) {
    if (!state || !input || typeof input !== 'object') throw Error('请先解锁，并选择一道菜');
    const index = Number(input.mealIndex), amount = Number(input.grams);
    if (!Number.isInteger(index) || index < 0 || index > 3) throw Error('餐次不正确');
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) throw Error('菜品重量需在1～10000g之间');
    const name = String(input.name || '').trim().slice(0, 140);
    if (!name) throw Error('菜品名称不能为空');
    const per100 = {};
    for (const key of FIELDS) {
      const value = Number(input.per100?.[key]);
      if (!validateMacro(value, key)) throw Error('菜品的营养数据不符合有效范围');
      per100[key] = value;
    }
    const meta = input.meta || {};
    const savedMeta = {
      id: String(meta.id || '').slice(0, 60),
      ja: String(meta.ja || '').slice(0, 120),
      mode: meta.mode === 'outside' ? 'outside' : 'home',
      oil: String(meta.oil || '').slice(0, 20),
      lowPer100: Number(meta.lowPer100) || 0,
      highPer100: Number(meta.highPer100) || 0,
      yieldGrams: Number(meta.yieldGrams) || 0,
      recipe: Array.isArray(meta.recipe) ? structuredClone(meta.recipe.slice(0, 40)) : []
    };
    const target = dayDraft(foodDate)[index];
    if (target.length >= 100) throw Error('单餐最多记录100项食物');
    const row = recompute({
      id: 'dish-entry-' + crypto.randomUUID(), name,
      code: '', source: String(input.source || '菜品参考估算').slice(0, 140),
      category: '成品菜', baseUnit: 'g', per100,
      amount, unit: 'g', factor: 1, dishMeta: savedMeta
    });
    target.push(row);
    mealIndex = index; selected = [];
    navigate('food');
    notify('成品菜已加入本次饮食。请点击「加密保存当天饮食」完成保存');
  }
  function dishRange(row) {
    if (row.dishMeta?.mode !== 'outside') return '';
    const low = Number(row.dishMeta.lowPer100) * Number(row.amount) / 100;
    const high = Number(row.dishMeta.highPer100) * Number(row.amount) / 100;
    return (Number.isFinite(low) && Number.isFinite(high) && high >= low)
      ? '外食估算范围 ' + fmt(low) + '–' + fmt(high) + ' kcal（记录中间估算值）'
      : '外食估算值（非商家实测）';
  }
  async function saveTemplate() {
    if(!selected.length)throw Error('没有可以保存的食物组合');
    const name=prompt('为这份常用餐命名（例如：燕麦早餐）');
    if(name===null)return;
    const clean=name.trim().slice(0,50);
    if(!clean)throw Error('常用餐名称不能为空');
    const l=library();
    if(l.templates.length>=40)throw Error('最多可以保存40份常用餐');
    const rows=selected.map(r=>copy(recompute(r)));
    if(rows.some(r=>!Number.isFinite(Number(r.amount))||r.amount<=0||r.amount>10000))throw Error('请检查食物重量');
    l.templates.push({id:'template-'+crypto.randomUUID(),name:clean,mealIndex:Number(byId('nutrition-meal').value),rows});
    await persist();renderTemplates();notify('常用餐已加密保存');
  }
  async function saveCustom(event) {
    event.preventDefault();
    const name=byId('nutrition-custom-name').value.trim().slice(0,100);
    const brand=byId('nutrition-custom-brand').value.trim().slice(0,60);
    const baseUnit=byId('nutrition-custom-unit').value;
    if(!name)throw Error('请填写食品名称');
    if(!['g','ml'].includes(baseUnit))throw Error('请选择正确单位');
    const per100={};
    for(const key of FIELDS){
      const raw=byId('nutrition-custom-'+key).value;
      if(raw.trim()==='')throw Error('请完整填写四项包装营养值，未知值不要填写0');
      const value=Number(raw);
      if(!validateMacro(value,key))throw Error('包装营养值超出每100'+baseUnit+'的范围');
      per100[key]=value;
    }
    const l=library();if(l.customFoods.length>=400)throw Error('自定义食品最多400项');
    l.customFoods.push({id:'custom-'+crypto.randomUUID(),name,brand,category:'自定义',baseUnit,per100,source:'用户录入包装营养标签'});
    await persist();
    byId('nutrition-custom-form').reset();populateCategories();renderResults();notify('品牌食品已加密保存');
  }
  function renderCustom() {
    const host=byId('nutrition-custom-list');host.replaceChildren();
    const foods=library().customFoods;
    if(!foods.length){host.append(node('small','','暂无自定义食品。'));return;}
    foods.slice().reverse().slice(0,50).forEach(food=>{
      const line=node('div','nutrition-mini');const left=node('div');
      left.append(node('strong','',food.name),node('small','',food.brand+' · '+fmt(food.per100.kcal)+' kcal/100'+food.baseUnit));
      line.append(left,button('加入',()=>addSelection(food)),button('删除',async()=>{
        if(!confirm('删除自定义食品「'+food.name+'」？已保存的饮食记录不受影响。'))return;
        const l=library();l.customFoods=l.customFoods.filter(x=>x.id!==food.id);
        l.favorites=l.favorites.filter(x=>x!==food.id);
        try{await persist();populateCategories();renderResults();renderCustom();renderFavorites();}catch(err){showError(err);}
      }));host.append(line);
    });
  }
  function init() {
    byId('nutrition-back').addEventListener('click',()=>navigate('food'));
    byId('food-library-launch').addEventListener('click',()=>{captureManual();selected=[];mealIndex=0;navigate('library');});
    byId('nutrition-query').addEventListener('input',()=>{resultLimit=18;renderResults();});
    byId('nutrition-category').addEventListener('change',()=>{resultLimit=18;renderResults();});
    byId('nutrition-meal').addEventListener('change',()=>{mealIndex=Number(byId('nutrition-meal').value);});
    byId('nutrition-add-day').addEventListener('click',()=>{try{addToDay();}catch(err){showError(err);}});
    byId('nutrition-save-template').addEventListener('click',()=>{void saveTemplate().catch(showError);});
    byId('nutrition-custom-form').addEventListener('submit',e=>{void saveCustom(e).then(renderCustom).catch(showError);});
  }
  const originalRenderLibrary=renderLibrary;
  window.Nutrition={
    init,renderLibrary(){originalRenderLibrary();renderCustom();},
    renderMeals,openForMeal,draftTotals,collectRows,mealTotals,savedDay,clearSession,manualForDay,savedManual,
    addDishToDay,getActiveMealIndex(){return mealIndex;}
  };
})();
