import { useEffect, useState, type FormEvent } from 'react';
import { completedWorkload, formatWorkload, listWorkoutRecords } from '../features/workout/selectors';
import { createTrainingExport, saveTrainingExport, type DateRange } from '../features/workout/export';
import { loadDefaultPlan, resolveTrainingPlan, type TrainingPlan } from '../features/plans/plan-data';
import { PlanView } from '../features/plans/PlanView';
import { PlanManager } from '../features/plans/PlanManager';
import { listNutritionDays } from '../features/nutrition/selectors';
import { NutritionPage } from '../features/nutrition/NutritionPage';
import type { Food } from '../features/nutrition/catalog';
import { calculateMacros } from '../features/nutrition/catalog';
import { unlockEncryptedVault, parseEnvelope, persistEncryptedVault, VAULT_KEY } from '../services/vault';
import { useAppStore } from '../stores/app';
import './app.css';

const screens = ['home', 'workout', 'plans', 'nutrition', 'progress', 'settings'] as const;
const labels = ['总览', '训练', '计划', '饮食', '体测', '数据管理'];
export function App() {
  const vault = useAppStore((s) => s.vault);
  const screen = useAppStore((s) => s.screen);
  const setVault = useAppStore((s) => s.setVault);
  const vaultKey = useAppStore((s) => s.vaultKey);
  const vaultSalt = useAppStore((s) => s.vaultSalt);
  const setScreen = useAppStore((s) => s.setScreen);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [defaultPlan, setDefaultPlan] = useState<TrainingPlan | null>(null);
  const [planWarning, setPlanWarning] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void loadDefaultPlan().then((plan) => { if (current) setDefaultPlan(plan); })
      .catch((e: unknown) => { if (current) setPlanWarning(e instanceof Error ? e.message : '默认计划加载失败'); });
    return () => { current = false; };
  }, []);

  async function unlock(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      if (!raw) throw new Error('尚未找到 RECOMP 加密保险库。迁移入口尚未开放，请继续使用旧版。');
      const session = await unlockEncryptedVault(parseEnvelope(raw), password);
      setVault(session.state, session.key, session.salt); setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法解锁保险库');
    }
  }
  if (!vault) return <main className="auth"><h1>RECOMP 2.0</h1><p>React 迁移预览 · 数据尚未迁移</p>
    <form onSubmit={unlock}><label>保险库密码<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button>解锁本地保险库</button></form>
    {error && <p role="alert">{error}</p>}<p className="notice">此预览不会写入、迁移或删除本地记录。请继续通过旧版 RECOMP 管理数据。</p></main>;
  const workouts = listWorkoutRecords(vault.workouts);
  const nutritionDays = listNutritionDays(vault.nutrition);
  const planResolution = resolveTrainingPlan(vault, defaultPlan);

  async function exportRecords(kind: 'json' | 'csv') {
    setExportMessage('');
    try {
      const payload = createTrainingExport(vault!.workouts, { startDate, endDate } satisfies DateRange);
      if (!payload.record_count) { setExportMessage('所选日期范围内没有训练记录。'); return; }
      const filename = await saveTrainingExport(kind, payload);
      setExportMessage('已生成 ' + filename + '。这是未加密文件，请妥善保管。');
    } catch (e) {
      setExportMessage(e instanceof Error ? e.message : '文件生成失败，请重试。');
    }
  }
  return <div className="layout"><header><strong>RECOMP 2.0</strong><button onClick={() => setVault(null)}>锁定</button></header>
    <nav aria-label="主要功能">{screens.map((key, i) => <button key={key} aria-current={screen === key} onClick={() => setScreen(key)}>{labels[i]}</button>)}</nav>
    <main><h1>{labels[screens.indexOf(screen)]}</h1>
      {screen === 'nutrition' && <NutritionPage days={nutritionDays} onAdd={async (food: Food, amount: number, meal: number, date: string) => {
        const dateValue = new Date(date + 'T12:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dateValue.valueOf()) || dateValue.toISOString().slice(0, 10) !== date ||
            !Number.isInteger(meal) || meal < 0 || meal > 3) throw new Error('日期或餐次无效');
        if (!vaultKey || !vaultSalt) throw new Error('保险库已锁定，请重新解锁');
        const oldDay = vault.nutrition[date] && typeof vault.nutrition[date] === 'object' ? vault.nutrition[date] as Record<string, unknown> : {};
        const savedItems = Array.isArray(oldDay.foodItems) ? oldDay.foodItems : [];
        const foodItems = Array.from({ length: 4 }, (_, i) => Array.isArray(savedItems[i]) ? [...savedItems[i]] : []);
        const row = { id: food.id, code: food.code, name: food.name, source: food.source, category: food.category,
          baseUnit: food.baseUnit, per100: food.per100, amount, unit: food.baseUnit, factor: 1, snap: calculateMacros(food, amount) };
        if (foodItems[meal].length >= 100) throw new Error('单餐最多记录100项食品');
        foodItems[meal].push(row);
        const oldEntries = Array.isArray(oldDay.entries) ? oldDay.entries : [];
        const entries = Array.from({ length: 4 }, (_, i) => oldEntries[i] && typeof oldEntries[i] === 'object'
          ? oldEntries[i] : { kcal: null, protein: null, fat: null, carbs: null, note: '' });
        const candidate = { ...vault, nutrition: { ...vault.nutrition, [date]: { ...oldDay, date, entries, foodItems } } };
        await persistEncryptedVault(candidate, vaultKey, vaultSalt);
        setVault(candidate, vaultKey, vaultSalt);
      }} />}
      {screen === 'home' && <p>已读取训练 {workouts.length} 天、饮食 {Object.keys(vault.nutrition).length} 天、体测 {vault.measurements.length} 条。</p>}
      {screen === 'workout' && <section aria-label="训练历史"><p>只读历史记录 · {workouts.length} 次训练。训练量只统计记录中 done=true 且有实际重量和次数的组。</p>
        {workouts.length === 0 ? <p>当前保险库没有训练记录。</p> : workouts.map(({ key, record }) => {
          const workload = completedWorkload(record);
          return <article className="workout-card" key={key}>
            <h2>{record.date + ' · ' + (record.title || record.name || '训练记录')}</h2>
            {typeof record.bodyParts === 'string' && <p>{record.bodyParts}</p>}
            <p>完成组数：{workload.completedSets}　完成训练量：{formatWorkload(workload.volumeKg)} kg</p>
            {(record.items ?? []).map((item, exerciseIndex) => <div key={String(item.exercise_id ?? item.name ?? exerciseIndex)}>
              <h3>{item.name || '未命名动作'}</h3>
              <ol>{(item.sets ?? []).map((set, setIndex) => <li key={setIndex}>
                {set.w == null ? '重量未记录' : String(set.w) + ' kg'} × {set.r == null ? '次数未记录' : String(set.r) + ' 次'} · {set.done === true ? '已完成' : '未完成'}
              </li>)}</ol>
            </div>)}
          </article>;
        })}
      </section>}
      {screen === 'plans' && <><PlanView plan={planResolution.plan} imported={planResolution.imported} warning={planResolution.warning || planWarning} />
        <PlanManager vault={vault} onCommit={async (candidate) => {
          if (!vaultKey || !vaultSalt) throw new Error('保险库已锁定，请重新解锁');
          await persistEncryptedVault(candidate, vaultKey, vaultSalt);
          setVault(candidate, vaultKey, vaultSalt);
        }} /></>}
      {screen === 'settings' && <section aria-label="备份与恢复"><h2>数据管理 / 备份与恢复</h2>
        <p className="notice">训练导出文件未加密，不会上传到服务器。请妥善保管；原加密完整备份与恢复仍由旧版入口处理。</p>
        <div className="date-filter"><label>开始日期<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label>结束日期<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label></div>
        <div className="export-actions"><button onClick={() => void exportRecords('json')}>导出训练记录（JSON）</button>
          <button onClick={() => void exportRecords('csv')}>导出训练记录（CSV）</button></div>
        {exportMessage && <p role="status">{exportMessage}</p>}
      </section>}
      {!['home', 'workout', 'settings', 'plans', 'nutrition'].includes(screen) && <p>此模块正在迁移。当前数据只保存在内存中，不会修改保险库。</p>}
    </main>
  </div>;
}
