import { useState, type FormEvent } from 'react';
import { completedWorkload, formatWorkload, listWorkoutRecords } from '../features/workout/selectors';
import { decryptVault, parseEnvelope, VAULT_KEY } from '../services/vault';
import { useAppStore } from '../stores/app';
import './app.css';

const screens = ['home', 'workout', 'plans', 'nutrition', 'progress', 'settings'] as const;
const labels = ['总览', '训练', '计划', '饮食', '体测', '数据管理'];
export function App() {
  const vault = useAppStore((s) => s.vault);
  const screen = useAppStore((s) => s.screen);
  const setVault = useAppStore((s) => s.setVault);
  const setScreen = useAppStore((s) => s.setScreen);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function unlock(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      if (!raw) throw new Error('尚未找到 RECOMP 加密保险库。迁移入口尚未开放，请继续使用旧版。');
      const state = await decryptVault(parseEnvelope(raw), password);
      setVault(state); setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法解锁保险库');
    }
  }
  if (!vault) return <main className="auth"><h1>RECOMP 2.0</h1><p>React 迁移预览 · 数据尚未迁移</p>
    <form onSubmit={unlock}><label>保险库密码<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button>解锁本地保险库</button></form>
    {error && <p role="alert">{error}</p>}<p className="notice">此预览不会写入、迁移或删除本地记录。请继续通过旧版 RECOMP 管理数据。</p></main>;
  const workouts = listWorkoutRecords(vault.workouts);
  return <div className="layout"><header><strong>RECOMP 2.0</strong><button onClick={() => setVault(null)}>锁定</button></header>
    <nav aria-label="主要功能">{screens.map((key, i) => <button key={key} aria-current={screen === key} onClick={() => setScreen(key)}>{labels[i]}</button>)}</nav>
    <main><h1>{labels[screens.indexOf(screen)]}</h1>
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
      {!['home', 'workout'].includes(screen) && <p>此模块正在迁移。当前数据只保存在内存中，不会修改保险库。</p>}
    </main>
  </div>;
}
