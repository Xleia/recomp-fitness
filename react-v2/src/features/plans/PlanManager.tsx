import { useRef, useState, type ChangeEvent } from 'react';
import type { RecompState } from '../../types/state';
import { PlanView } from './PlanView';
import { addPlanVersion, hasDuplicatePlan, MAX_PLAN_BYTES, readPlanLibrary, selectPlanVersion } from './plan-library';
import { parseTrainingPlan, type TrainingPlan } from './plan-data';

export function PlanManager({ vault, onCommit }: {
  vault: RecompState;
  onCommit: (next: RecompState) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<TrainingPlan | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  let library;
  try { library = readPlanLibrary(vault); }
  catch (e) {
    return <section aria-label="计划版本管理"><h2>计划导入与版本</h2>
      <p role="alert">计划库异常，原数据已保留：{e instanceof Error ? e.message : '无法读取版本库'}</p></section>;
  }
  const duplicate = preview ? hasDuplicatePlan(library, preview) : false;
  const activePlan = library.versions.find((version) => version.entry_id === library.active_entry_id)?.plan;

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setMessage(''); setError(''); setPreview(null);
    if (!file) return;
    try {
      if (file.size > MAX_PLAN_BYTES) throw new Error('单个计划文件不能超过 512 KiB');
      const value: unknown = JSON.parse(await file.text());
      setPreview(parseTrainingPlan(value));
    } catch (e) {
      setError(e instanceof Error ? e.message : '文件解析失败');
    }
  }
  async function save(activate: boolean, allowDuplicate = false) {
    if (!preview) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const current = readPlanLibrary(vault);
      const entryId = crypto.randomUUID();
      const nextLibrary = addPlanVersion(current, preview, {
        entryId, importedAt: new Date().toISOString(), activate, allowDuplicate,
      });
      await onCommit({ ...vault, plan_library: nextLibrary });
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      setSelected(activate ? entryId : current.active_entry_id || '');
      setMessage(activate ? '计划已加密保存并启用；历史训练记录未修改。' : '计划已加密保存；当前启用计划未切换。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，原数据保持不变');
    } finally { setBusy(false); }
  }
  async function switchPlan(entryId: string | null) {
    if (!window.confirm(entryId ? '确认启用所选计划？历史记录保持不变。' : '确认恢复系统默认计划？已保存的计划版本会保留。')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const nextLibrary = selectPlanVersion(readPlanLibrary(vault), entryId);
      await onCommit({ ...vault, plan_library: nextLibrary });
      setSelected(entryId || '');
      setMessage(entryId ? '已切换计划；历史训练记录未修改。' : '已恢复系统默认计划；已保存版本仍保留。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '切换失败，原数据保持不变');
    } finally { setBusy(false); }
  }
  return <section aria-label="计划导入与版本管理" className="plan-manager">
    <h2>计划导入与版本管理</h2>
    <p>导入的计划仅保存在本地加密保险库。切换计划不会更改历史训练记录。</p>
    <label>已保存计划版本
      <select value={selected || library.active_entry_id || ''} onChange={(e) => setSelected(e.target.value)} disabled={busy}>
        <option value="">系统默认计划</option>
        {library.versions.map((entry) => <option value={entry.entry_id} key={entry.entry_id}>
          {(entry.entry_id === library.active_entry_id ? '[当前启用] ' : '') + entry.plan.name + ' · v' + entry.plan.plan_version + ' · ' + entry.imported_at}
        </option>)}
      </select>
    </label>
    <div className="export-actions">
      <button disabled={busy} onClick={() => void switchPlan(selected || null)}>启用所选版本</button>
      <button disabled={busy} onClick={() => void switchPlan(null)}>恢复系统默认计划</button>
    </div>
    <label>导入训练计划 JSON<input ref={inputRef} type="file" accept=".json,application/json" onChange={(e) => void readFile(e)} disabled={busy} /></label>
    {activePlan && <p>版本库当前启用：{activePlan.name} · v{activePlan.plan_version}</p>}
    {preview && <div className="plan-preview">
      <h3>待导入计划预览</h3>
      <PlanView plan={preview} imported={false} warning={null} />
      {duplicate && <p className="notice">相同计划 ID 和版本已存在。若仍要保留，请明确选择“另存为副本”。</p>}
      <div className="export-actions">
        {duplicate ? <>
          <button disabled={busy} onClick={() => void save(false, true)}>另存为副本</button>
          <button disabled={busy} onClick={() => void save(true, true)}>另存副本并启用</button>
        </> : <>
          <button disabled={busy} onClick={() => void save(false)}>仅保存</button>
          <button disabled={busy} onClick={() => void save(true)}>保存并启用</button>
        </>}
        <button disabled={busy} onClick={() => { setPreview(null); setMessage('已取消导入，未保存。'); if (inputRef.current) inputRef.current.value = ''; }}>取消预览</button>
      </div>
    </div>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
