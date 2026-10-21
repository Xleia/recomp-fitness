/* UI for encrypted plan snapshots; imported strings are rendered only as text. */
(() => {
  'use strict';
  const api=window.RecompPlans;
  let draft=null,token=0,initialized=false,working=false;
  const get=id=>document.getElementById('plan-'+id);
  const status=message=>{get('manager-status').textContent=message;};
  function clearSession(){
    token++;draft=null;get('import-file').value='';get('preview-body').replaceChildren();get('preview').hidden=true;
    get('versions').replaceChildren(el('option','','系统默认计划'));get('versions').children[0].value='';status('');
    $('current-plan-label').textContent='';
  }
  function clearPreview(){token++;draft=null;get('import-file').value='';get('preview-body').replaceChildren();get('preview').hidden=true;}
  function unlocked(){if(!state||!keyRef||locking||document.hidden)throw Error('请先解锁保险库');}
  function render(){
    if(!state)return;
    const select=get('versions');if(!select)return;const prior=select.value;
    select.replaceChildren();const builtIn=el('option','','系统默认计划');builtIn.value='';select.append(builtIn);
    try{
      const lib=api.library(state);
      builtIn.textContent=lib.active_entry_id===null?'系统默认计划（当前启用）':'系统默认计划';
      for(const entry of lib.versions){
        const option=el('option','',`${entry.entry_id===lib.active_entry_id?'[当前启用] ':''}${entry.plan.name} · v${entry.plan.plan_version} · ${entry.imported_at} · ${entry.entry_id.slice(-8)}`);
        option.value=entry.entry_id;select.append(option);
      }
      select.value=lib.versions.some(x=>x.entry_id===prior)?prior:(lib.active_entry_id || '');
      const resolution=api.resolve(state);
      get('activate').disabled=working;get('reset-default').disabled=working;
      if(resolution.warning)status(resolution.warning);
    }catch(error){status('计划库异常，原数据保留。'+error.message);get('activate').disabled=true;get('reset-default').disabled=true;}
  }
  function showDays(container,days,label){
    container.append(el('h4','',label));
    const order=[1,2,3,4,5,6,0];
    for(const day of days.slice().sort((a,b)=>order.indexOf(a.weekday)-order.indexOf(b.weekday))){
      const details=el('details'),summary=el('summary','',`周${DAYS[day.weekday]} · ${day.name} · ${{strength:'力量',basketball:'篮球',cardio:'有氧',rest:'休息'}[day.type]}`);details.append(summary);
      if(day.description)details.append(el('p','',day.description));
      if(day.muscle_groups.length)details.append(el('p','',`目标肌群：${day.muscle_groups.join('、')}`));
      const list=el('ol');
      for(const ex of day.exercises.slice().sort((a,b)=>a.order-b.order)){
        const details=[`${ex.sets} 组`,`${api.displayRange(ex.reps)} 次`,`休息 ${api.restLabel(ex.rest_seconds)}`];
        if(ex.rir!==undefined)details.push('RIR '+api.displayRange(ex.rir));if(ex.rpe!==undefined)details.push('RPE '+api.displayRange(ex.rpe));
        list.append(el('li','',`${ex.name} · ${details.join(' · ')}`));
      }
      if(day.exercises.length)details.append(list);else details.append(el('p','','无工作组'));
      container.append(details);
    }
  }
  async function preview(file){
    clearPreview();if(!file){status('已取消选择文件。');return;}
    const current=token,generation=authGeneration;
    try{
      unlocked();if(file.size>api.MAX_BYTES)throw Error('计划文件超过 512 KiB，未导入');
      const text=await file.text();
      if(current!==token||generation!==authGeneration||!state||locking||document.hidden)return;
      let value;try{value=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('文件不是合法 JSON，请检查逗号、引号与括号');}
      const plan=api.validate(value);const matches=api.duplicates(state,plan);
      const body=get('preview-body');body.replaceChildren();
      body.append(el('p','',`${plan.name} · v${plan.plan_version} · ${plan.duration_weeks} 周`),el('p','',plan.goal));
      if(plan.description)body.append(el('p','',plan.description));
      if(matches.length)body.append(el('p','',`已存在 ${matches.length} 个相同计划ID/版本的本地条目。确认后保存独立副本，不覆盖旧条目。`));
      showDays(body,plan.days,'每周安排');for(const week of plan.weeks || [])showDays(body,week.days,`第 ${week.week} 周覆盖`);
      draft={plan,generation};get('preview').hidden=false;status('校验通过，请预览并确认保存；当前尚未写入任何数据。');
    }catch(error){if(current===token){clearPreview();status(error.message || '计划解析失败，未保存');}}
  }
  async function action(operation){
    if(working)return;working=true;
    const ids=['save-only','save-enable','activate','reset-default'];ids.forEach(id=>get(id).disabled=true);
    try{unlocked();await operation();}catch(error){if(state&&!locking)status(error.message || '操作失败，原数据保持不变');}
    finally{working=false;ids.forEach(id=>get(id).disabled=false);render();}
  }
  async function save(activate){
    const pending=draft,saveToken=token;if(!pending||pending.generation!==authGeneration)throw Error('请重新选择并预览计划文件');
    const duplicate=api.duplicates(state,pending.plan).length>0;
    if(duplicate&&!confirm('相同计划ID和版本已存在。将另存为独立本地副本，旧版本不会覆盖，是否继续？'))return;
    if(activate&&!confirm('启用新计划会重新显示训练模板，并丢弃尚未保存的页面输入。已保存训练和饮食记录保持不变。继续？'))return;
    const options={entryId:crypto.randomUUID(),importedAt:new Date().toISOString(),activate,allowDuplicate:duplicate};
    await commitStateChange(candidate=>{candidate.plan_library=api.add(candidate,pending.plan,options);},()=>token===saveToken&&draft===pending);
    clearPreview();render();
    if(activate){expandedExercises.clear();renderHome();renderTraining();}
    status(activate?'计划已加密保存并启用。':'计划已加密保存，当前启用计划保持不变。');
  }
  async function activate(entryId){
    if(entryId===null&&!api.getDefault())throw Error('默认计划尚未就绪，请先重试加载');
    const message=entryId===null?'确认恢复系统默认计划？已保存版本和历史记录都会保留，未保存的页面输入将丢弃。':'确认启用所选计划版本？历史记录保持不变，未保存的页面输入将丢弃。';
    if(!confirm(message))return;
    await commitStateChange(candidate=>{candidate.plan_library=api.activate(candidate,entryId);});
    clearPreview();expandedExercises.clear();renderHome();renderTraining();status(entryId===null?'已恢复系统默认计划，已导入版本全部保留。':'已启用所选计划版本，历史记录保持不变。');
  }
  function init(){
    if(initialized)return;initialized=true;
    get('import-file').addEventListener('change',()=>preview(get('import-file').files?.[0]));
    get('import-cancel').addEventListener('click',()=>{clearPreview();status('已取消导入，未保存。');});
    get('save-only').addEventListener('click',()=>action(()=>save(false)));get('save-enable').addEventListener('click',()=>action(()=>save(true)));
    get('activate').addEventListener('click',()=>action(()=>activate(get('versions').value || null)));
    get('reset-default').addEventListener('click',()=>action(()=>activate(null)));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)clearSession();});window.addEventListener('pagehide',clearSession);
    for(const id of ['lock-btn','manual-lock','import-btn','change-btn','delete-vault'])$(id)?.addEventListener('click',clearSession);
  }
  window.PlanManager={init,render,clearSession};
})();
