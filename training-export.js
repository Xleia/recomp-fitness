/* RECOMP additive training export. No storage writes and no network requests. */
(() => {
  'use strict';
  const sensitive = /^(password|passwd|passphrase|pass|pwd|pin|secret|clientsecret|key|keyref|saltref|salt|iv|aad|ciphertext|encryptionkey|cryptokey|privatekey|publickey|apikey|token|accesstoken|refreshtoken|idtoken|authorization|credentials|credential|auth|authentication|cookie|sessionid)$/i;
  function clean(value) {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
      .filter(([k]) => !sensitive.test(k.replace(/[_\s-]/g, ''))).map(([k,v]) => [k,clean(v)]));
    return value;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === value;
  }
  function dateOf(record, key) {
    if (validDate(record?.date)) return record.date;
    return validDate(key) ? key : null;
  }
  function pick(obj, keys) {
    for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    return null;
  }
  function extra(obj, omitted) {
    return Object.fromEntries(Object.entries(obj || {}).filter(([k]) => !omitted.includes(k)));
  }
  function build(saved, start = '', end = '', now = new Date()) {
    if ((start && !validDate(start)) || (end && !validDate(end))) throw Error('请选择有效日期');
    if (start && end && start > end) throw Error('开始日期不能晚于结束日期');
    if (!saved?.workouts || typeof saved.workouts !== 'object') throw Error('训练记录格式不受支持，未导出');
    const inRange = date => !(start || end) || (date && (!start || date >= start) && (!end || date <= end));
    const selected = Object.entries(saved.workouts).filter(([key,w]) => w && typeof w === 'object' && inRange(dateOf(w,key)))
      .sort(([ka,a],[kb,b]) => (dateOf(a,ka) || '9999-99-99').localeCompare(dateOf(b,kb) || '9999-99-99'));
    const legacy = Array.isArray(saved.legacyHistory) ? saved.legacyHistory.filter(w => w && inRange(dateOf(w,''))) : [];
    if (!selected.length && !legacy.length) throw Error(start || end ? '所选日期范围内没有训练记录' : '没有可导出的训练记录，请先保存训练记录');
    const workouts = Object.fromEntries(selected.map(([k,v]) => [k,clean(v)]));
    // Only exact migrated copies of a normal date-keyed record are excluded from totals.
    const signature = (w,key) => JSON.stringify([dateOf(w,key),w.items]);
    const normal = new Set(selected.filter(([key]) => !key.startsWith('legacy-')).map(([key,w]) => signature(w,key)));
    const duplicates = selected.filter(([key,w]) => key.startsWith('legacy-') && normal.has(signature(w,key))).map(([key]) => key);
    const countable = selected.filter(([key]) => !duplicates.includes(key));
    const completed = countable.reduce((total,[,w]) => total + (Array.isArray(w.items) ? w.items : []).reduce((n,item) => n + (Array.isArray(item?.sets) ? item.sets : []).filter(set => set?.done === true).length,0),0);
    return {format:'recomp-training-export', schema_version:1, exported_at:now.toISOString(),
      encrypted:false, date_range:{start:start || null,end:end || null,inclusive:true},
      source:'persisted_local_vault', weight_unit:'kg', workout_count:selected.length,
      record_count:selected.length, completed_set_count:completed, excluded_legacy_duplicate_keys:duplicates,
      records:selected.map(([key]) => ({record_key:key,record:workouts[key]})),
      notes:['records 为完整记录数组；workouts 为同一批数据的兼容字典视图，两者不可重复累计。',
        'excluded_legacy_duplicate_keys 中的旧迁移副本保留在原始 JSON，但不计完成组数，也不重复输出 CSV 组行。',
        'workouts 保留实际保存结构；未使用预设训练计划补全字段。',
        'day 是原记录星期索引：0=周日，1=周一，…，6=周六。',
        'done=true 才表示确认完成；空白或未完成组也保留，不应计为完成训练量。',
        'legacy_history 为历史迁移摘要，可能与 workouts 重复，不应重复累计。',
        '未保存的训练日名称、部位、RPE/RIR、时长、休息时间等保持为空。'],
      workouts,legacy_history:clean(legacy)};
  }
  const headers = ['记录类型','记录键','训练日期','星期索引','训练日名称','训练部位','动作序号','动作名称',
    '已记录组数','确认完成组数','组序号','完成状态','重量_kg','次数','组RPE','组RIR','组休息时间',
    '训练时长','训练备注','动作备注','组备注','训练其他数据_JSON','动作其他数据_JSON','组原始数据_JSON'];
  function cell(v) {
    if (v === null || v === undefined) return '""';
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    // Text-only spreadsheet formula defense; numeric values, including negatives, stay numeric.
    if (typeof v === 'string' && /^[\s\uFEFF]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g,'""') + '"';
  }
  function csv(data) {
    const rows = [headers];
    for (const [key,w] of Object.entries(data.workouts)) {
      if (data.excluded_legacy_duplicate_keys?.includes(key)) continue;
      const base = ['workout', key, dateOf(w,key), w.day ?? null,
        pick(w,['title','name','dayName']),pick(w,['bodyParts','bodyPart','muscleGroups','muscles'])];
      const tail = [pick(w,['duration','durationMinutes','durationSeconds']),pick(w,['note','notes']),null,null,extra(w,['items']),null,null];
      const items = Array.isArray(w.items) ? w.items : [];
      if (!items.length) { rows.push([...base,null,null,null,null,null,null,null,null,null,null,null,...tail]); continue; }
      items.forEach((item,i) => {
        const sets = Array.isArray(item?.sets) ? item.sets : [];
        const completed = sets.some(s => typeof s?.done === 'boolean') ? sets.filter(s => s?.done === true).length : null;
        const finish = s => [pick(w,['duration','durationMinutes','durationSeconds']),pick(w,['note','notes']),
          pick(item,['note','notes']),pick(s,['note','notes']),extra(w,['items']),extra(item,['sets']),s ?? null];
        if (!sets.length) rows.push([...base,i+1,item?.name ?? null,0,completed,null,null,null,null,null,null,null,...finish(null)]);
        sets.forEach((s,j) => rows.push([...base,i+1,item?.name ?? null,sets.length,completed,j+1,
          s?.done ?? null,s?.w ?? null,s?.r ?? null,pick(s,['rpe','RPE']),pick(s,['rir','RIR']),
          pick(s,['rest','restSeconds','restTime']),...finish(s)]));
      });
    }
    for (const w of data.legacy_history) rows.push(['legacy_summary',null,dateOf(w,''),null,pick(w,['title','name']),
      null,null,null,null,w.sets ?? null,null,null,null,null,null,null,null,null,null,null,null,w,null,null]);
    return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
  }
  // The guarded hook is used by local verification only; production exposes no data API.
  if (typeof module !== 'undefined' && module.exports) { module.exports = {build,csv,validDate}; return; }
  function install() {
    const backup = document.getElementById('backup-btn');
    if (!backup || document.getElementById('training-export-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'training-export-panel'; panel.className = 'training-export';
    panel.innerHTML = `<h3>未加密训练记录导出</h3>
      <p>用于 Excel / ChatGPT 分析。仅导出实际保存的训练记录，与上方的加密完整备份分开。</p>
      <p>文件未加密，请妥善保管。导出在本机完成；请先保存训练页面的修改。</p>
      <div class="training-export-dates">
        <label class="field">开始日期（可留空）<input id="training-export-start" type="date"></label>
        <label class="field">结束日期（可留空）<input id="training-export-end" type="date"></label>
      </div>
      <label class="field">文件格式<select id="training-export-format"><option value="json">JSON · 完整训练记录结构</option><option value="csv">CSV · 每动作每组一行（Excel）</option></select></label>
      <button id="training-export-all" type="button" class="secondary full">清除日期筛选 · 导出全部历史</button>
      <button id="training-export-create" type="button" class="primary full">导出训练记录（未加密）</button>
      <p id="training-export-status" role="status" aria-live="polite"></p>
      <div id="training-export-ready" hidden>
        <a id="training-export-download" class="secondary full">保存到本地</a>
        <button id="training-export-share" type="button" class="secondary full" hidden>系统分享 / 存储到“文件”</button>
        <p>iPhone 如打开文件预览，可点分享，再选择“存储到文件”。</p>
      </div>`;
    backup.closest('article').append(panel);
    const get = name => document.getElementById('training-export-' + name);
    let file = null, url = null;
    function clear() {
      if (url) URL.revokeObjectURL(url);
      url = null; file = null;
      get('ready').hidden = true;get('download').removeAttribute('href');get('status').textContent = '';
    }
    ['start','end','format'].forEach(id => get(id).addEventListener('change',clear));
    get('all').addEventListener('click',() => {get('start').value = '';get('end').value = '';clear();get('status').textContent = '已选择全部历史，请点击导出按钮。';});
    get('create').addEventListener('click', async () => {
      clear();const button = get('create');if(button.disabled)return;button.disabled = true;
      try {
        if (!state || !keyRef || locking) throw Error('请先解锁保险库');
        if (!confirm('导出的训练记录不加密、不设密码。请妥善保管，仅向可信对象分享。是否继续？')) return;
        const activeKey = keyRef, generation = authGeneration;
        await writeQueue;
        if (!state || keyRef !== activeKey || locking || authGeneration !== generation) throw Error('保险库已锁定或切换，请重新解锁后导出');
        // Read the persisted vault, never the unsaved form or a preset plan.
        const envelope = parseEnvelope(localStorage.getItem(VAULT_KEY));
        const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(envelope.iv),additionalData:AAD,tagLength:128},activeKey,b64ToBytes(envelope.ciphertext));
        const saved = JSON.parse(new TextDecoder().decode(plain));
        if (!state || keyRef !== activeKey || locking || authGeneration !== generation || document.hidden) throw Error('保险库已锁定或切换，请重新解锁后导出');
        const data = build(saved,get('start').value,get('end').value);
        const format = get('format').value;
        const stamp = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const filename = `RECOMP_training_export_${stamp}.${format}`;
        const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
        file = new File([format === 'csv' ? csv(data) : JSON.stringify(data,null,2)],filename,{type:mime});
        url = URL.createObjectURL(file);
        get('download').href = url;get('download').download = filename;
        get('share').hidden = !(navigator.share && navigator.canShare && navigator.canShare({files:[file]}));
        get('ready').hidden = false;
        get('status').textContent = `文件已生成：${data.workout_count} 条训练记录，${data.legacy_history.length} 条历史摘要。请选择保存或系统分享。`;
      } catch (e) { get('status').textContent = e.message || '导出失败，请重试'; }
      finally {button.disabled = false;}
    });
    get('share').addEventListener('click',async () => {
      if (!file || !state || !keyRef || locking) {clear();return;}
      const sharedFile = file;
      try {await navigator.share({files:[sharedFile]});}
      catch(e) {if(e.name !== 'AbortError') get('status').textContent = '系统分享未完成，请重新生成后选择“保存到本地”。';}
    });
    get('download').addEventListener('click',event => {
      if (!file || !state || !keyRef || locking) {event.preventDefault();clear();}
    });
    document.addEventListener('visibilitychange',() => {if(document.hidden)clear();});
    window.addEventListener('pagehide',clear);
    ['lock-btn','manual-lock','delete-vault','import-btn','change-btn'].forEach(id => document.getElementById(id)?.addEventListener('click',clear));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install); else install();
})();

