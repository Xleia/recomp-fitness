import { useEffect, useRef, useState, type FormEvent } from 'react';
import { completedWorkload, formatWorkload, listWorkoutRecords } from '../features/workout/selectors';
import { WorkoutPage } from '../features/workout/WorkoutPage';
import { createTrainingExport, saveTrainingExport, type DateRange } from '../features/workout/export';
import { loadDefaultPlan, resolveTrainingPlan, type TrainingPlan } from '../features/plans/plan-data';
import { PlanView } from '../features/plans/PlanView';
import { PlanManager } from '../features/plans/PlanManager';
import { listNutritionDays } from '../features/nutrition/selectors';
import { readFoodLibrary, addCustomFood, toggleFavorite, deleteCustomFood, saveMealTemplate, removeMealTemplate } from '../features/nutrition/food-library';
import { NutritionPage } from '../features/nutrition/NutritionPage';
import { BackupControls } from '../features/settings/BackupControls';
import { SecurityControls } from '../features/settings/SecurityControls';
import { ProgressPage } from '../features/progress/ProgressPage';
import { removeMeasurementDate, upsertMeasurement, type Measurement } from '../features/progress/selectors';
import type { RecompState } from '../types/state';
import type { Food } from '../features/nutrition/catalog';
import { calculateMacros } from '../features/nutrition/catalog';
import { unlockEncryptedVault, unlockWithKey, parseEnvelope, persistEncryptedVault, reencryptVaultWithPassword, toBase64, VAULT_KEY } from '../services/vault';
import { LEGACY_STORAGE_KEY, migrateLegacyState } from '../services/legacy-migration';
import { rememberTodayKey, readTodayKey, forgetTodayKey, todayInTokyo } from '../services/daily-unlock';
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
  const [authChecking, setAuthChecking] = useState(true);
  const [authNotice, setAuthNotice] = useState('');
  const unlockDay = useRef<string | null>(null);
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

  useEffect(() => {
    let active = true;
    async function restore() {
      const current = useAppStore.getState().vault;
      if (current && unlockDay.current && unlockDay.current !== todayInTokyo()) {
        await forgetTodayKey();
        setVault(null); unlockDay.current = null;
      }
      if (useAppStore.getState().vault || !window.isSecureContext || !window.crypto?.subtle) {
        if (active) setAuthChecking(false);
        return;
      }
      try {
        const remembered = await readTodayKey();
        const raw = localStorage.getItem(VAULT_KEY);
        if (!remembered || !raw) return;
        const envelope = parseEnvelope(raw);
        if (remembered.day !== todayInTokyo() || remembered.salt !== envelope.salt) {
          await forgetTodayKey(); return;
        }
        const session = await unlockWithKey(envelope, remembered.key);
        if (active && !document.hidden && !useAppStore.getState().vault) {
          setVault(session.state, session.key, session.salt);
          unlockDay.current = todayInTokyo();
        }
      } catch {
        await forgetTodayKey();
      } finally {
        if (active) setAuthChecking(false);
      }
    }
    void restore();
    const onVisible = () => { if (!document.hidden) void restore(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; document.removeEventListener('visibilitychange', onVisible); };
  }, [setVault]);

  async function commitVault(candidate: RecompState) {
    if (!vaultKey || !vaultSalt) throw new Error('保险库已锁定，请重新解锁');
    await persistEncryptedVault(candidate, vaultKey, vaultSalt);
    setVault(candidate, vaultKey, vaultSalt);
  }

  async function unlock(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      if (!raw) {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!legacy) throw new Error('尚未找到 RECOMP 加密保险库或旧版记录。');
        if (password.length < 12 || password.length > 200) throw new Error('请设置至少12个字符的新保险库密码，以加密迁移的旧记录。');
        const migrated = migrateLegacyState(legacy, todayInTokyo());
        const session = await reencryptVaultWithPassword(migrated, password);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        setVault(session.state, session.key, session.salt); unlockDay.current = todayInTokyo(); setPassword('');
        const remembered = await rememberTodayKey(session.key, toBase64(session.salt));
        setAuthNotice(remembered ? '旧版记录已在本机加密迁移；当天可免重复输入密码。' : '旧版记录已在本机加密迁移；浏览器无法保存当天密钥。');
        return;
      }
      const session = await unlockEncryptedVault(parseEnvelope(raw), password);
      setVault(session.state, session.key, session.salt); unlockDay.current = todayInTokyo(); setPassword('');
      const remembered = await rememberTodayKey(session.key, toBase64(session.salt));
      setAuthNotice(remembered ? '保险库已解锁；当天可免重复输入密码。' : '保险库已解锁；浏览器无法保存当天密钥，将继续要求密码。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法解锁保险库');
    }
  }
  if (!vault) return <main className="auth"><h1>RECOMP 2.0</h1><p>React 迁移预览 · 数据只在本机处理</p>{localStorage.getItem(LEGACY_STORAGE_KEY)&&!localStorage.getItem(VAULT_KEY)&&<p className="notice">检测到旧版本地记录。首次解锁时请设置至少12个字符的新密码，记录会先加密保存到本机，成功后再清除旧数据。</p>}
    {authChecking && <p role="status">正在检查当天的本地解锁状态…</p>}<form onSubmit={unlock}><label>{localStorage.getItem(LEGACY_STORAGE_KEY)&&!localStorage.getItem(VAULT_KEY)?'设置新保险库密码':'保险库密码'}<input type="password" autoComplete={localStorage.getItem(LEGACY_STORAGE_KEY)&&!localStorage.getItem(VAULT_KEY)?'new-password':'current-password'} minLength={localStorage.getItem(LEGACY_STORAGE_KEY)&&!localStorage.getItem(VAULT_KEY)?12:undefined} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button>解锁本地保险库</button></form>
    {error && <p role="alert">{error}</p>}{authNotice && <p role="status">{authNotice}</p>}<p className="notice">所有记录仅在本机处理；输入密码不会向服务器发送数据。</p></main>;
  const workouts = listWorkoutRecords(vault.workouts);
  const nutritionDays = listNutritionDays(vault.nutrition);
  const foodLibrary = readFoodLibrary(vault);
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
  return <div className="layout"><header><strong>RECOMP 2.0</strong><button onClick={() => { void forgetTodayKey().finally(() => { unlockDay.current = null; setVault(null); }); }}>锁定</button></header>
    <nav aria-label="主要功能">{screens.map((key, i) => <button key={key} aria-current={screen === key} onClick={() => setScreen(key)}>{labels[i]}</button>)}</nav>
    <main><h1>{labels[screens.indexOf(screen)]}</h1>
      {screen === 'nutrition' && <NutritionPage days={nutritionDays} nutrition={vault.nutrition} foodLibrary={foodLibrary} onFavorite={async (id) => { await commitVault({ ...vault, foodLibrary: toggleFavorite(foodLibrary, id) }); }} onSaveCustom={async (value) => { const food = { ...value, id: 'custom-' + crypto.randomUUID(), code: '', zh: value.name, category: '自定义食品', source: 'user' as const }; await commitVault({ ...vault, foodLibrary: addCustomFood(foodLibrary, food) }); }} onDeleteCustom={async (id) => { await commitVault({ ...vault, foodLibrary: deleteCustomFood(foodLibrary, id) }); }} onSaveRecipe={async (id,value)=>{const old=foodLibrary.dishRecipes&&typeof foodLibrary.dishRecipes==='object'?foodLibrary.dishRecipes as Record<string,unknown>:{};await commitVault({...vault,foodLibrary:{...foodLibrary,dishRecipes:{...old,[id]:value}}});}} onToggleDishFavorite={async(id)=>{const old=Array.isArray(foodLibrary.dishFavorites)?foodLibrary.dishFavorites.filter((x):x is string=>typeof x==='string'):[];const next=old.includes(id)?old.filter(x=>x!==id):[...old,id].slice(-120);await commitVault({...vault,foodLibrary:{...foodLibrary,dishFavorites:next}});}} onAddDish={async(entry,date)=>{const check=new Date(date+'T12:00:00Z');if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||!Number.isFinite(check.valueOf())||check.toISOString().slice(0,10)!==date)throw Error('日期无效');if(entry.grams<1||entry.grams>10000)throw Error('菜品重量需在1～10000g之间');const old=vault.nutrition[date]&&typeof vault.nutrition[date]==='object'?vault.nutrition[date] as Record<string,unknown>:{};const saved=Array.isArray(old.foodItems)?old.foodItems:[];const foodItems=Array.from({length:4},(_,i)=>Array.isArray(saved[i])?[...saved[i]]:[]);if(foodItems[entry.mealIndex].length>=100)throw Error('单餐最多记录100项食品');const p=entry.per100,g=entry.grams;foodItems[entry.mealIndex].push({id:'dish-entry-'+crypto.randomUUID(),name:entry.name,code:'',source:entry.source,category:'成品菜',baseUnit:'g',per100:p,amount:g,unit:'g',factor:1,dishMeta:entry.meta,snap:{kcal:p.kcal*g/100,protein:p.protein*g/100,fat:p.fat*g/100,carbs:p.carbs*g/100}});await commitVault({...vault,nutrition:{...vault.nutrition,[date]:{...old,date,foodItems}}});}} onSaveTemplate={async (name,row) => { const template={id:'template-'+crypto.randomUUID(),name:name.slice(0,50),mealIndex:0,rows:[row]}; await commitVault({ ...vault, foodLibrary: saveMealTemplate(foodLibrary,template) }); }} onRemoveTemplate={async (id) => { await commitVault({ ...vault, foodLibrary: removeMealTemplate(foodLibrary,id) }); }} onApplyTemplate={async (rows,date,meal) => { if(!Number.isInteger(meal)||meal<0||meal>3||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) throw new Error('日期或餐次无效'); const day=vault.nutrition[date]&&typeof vault.nutrition[date]==='object'?vault.nutrition[date] as Record<string,unknown>:{}; const old=Array.isArray(day.foodItems)?day.foodItems:[]; const items=Array.from({length:4},(_,i)=>Array.isArray(old[i])?[...old[i]]:[]); if(items[meal].length+rows.length>100) throw new Error('单餐最多记录100项食品'); items[meal].push(...rows.map(row=>({...row}))); const candidate={...vault,nutrition:{...vault.nutrition,[date]:{...day,date,foodItems:items}}}; await commitVault(candidate); }} onSaveManual={async (date, entries, lunch) => {
        const oldDay = vault.nutrition[date] && typeof vault.nutrition[date] === 'object' ? vault.nutrition[date] as Record<string, unknown> : {};
        const candidate = { ...vault, nutrition: { ...vault.nutrition, [date]: { ...oldDay, date, entries, lunch } } };
        await commitVault(candidate);
      }} onAdd={async (food: Food, amount: number, meal: number, date: string) => {
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
      {screen === 'progress' && <ProgressPage measurements={vault.measurements as Measurement[]}
        onSave={async (date, weight, waist) => {
          const candidate = { ...vault, measurements: upsertMeasurement(vault.measurements as Measurement[], date, weight, waist) };
          await commitVault(candidate);
        }}
        onDelete={async (date) => {
          const candidate = { ...vault, measurements: removeMeasurementDate(vault.measurements as Measurement[], date) };
          await commitVault(candidate);
        }} />}
      {screen === 'workout' && <WorkoutPage workouts={vault.workouts} plan={planResolution.plan} startDate={vault.settings.start}
        onSave={async (record) => {
          const candidate = { ...vault, workouts: { ...vault.workouts, [String(record.date)]: record } };
          await commitVault(candidate);
        }} />}
      {screen === 'plans' && <><PlanView plan={planResolution.plan} imported={planResolution.imported} warning={planResolution.warning || planWarning} />
        <PlanManager vault={vault} onCommit={async (candidate) => {
          if (!vaultKey || !vaultSalt) throw new Error('保险库已锁定，请重新解锁');
          await commitVault(candidate);
        }} /></>}
      {screen === 'settings' && <section aria-label="备份与恢复"><h2>数据管理 / 备份与恢复</h2>
        <p className="notice">训练导出文件未加密，不会上传到服务器。请妥善保管；原加密完整备份与恢复仍由旧版入口处理。</p>
        <div className="date-filter"><label>开始日期<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label>结束日期<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label></div>
        <div className="export-actions"><button onClick={() => void exportRecords('json')}>导出训练记录（JSON）</button>
          <button onClick={() => void exportRecords('csv')}>导出训练记录（CSV）</button></div>
        {exportMessage && <p role="status">{exportMessage}</p>}
        <BackupControls onRestored={(session) => setVault(session.state, session.key, session.salt)} />
        <SecurityControls onChangePassword={async (next) => { if (!vault) throw new Error('保险库已锁定'); const session = await reencryptVaultWithPassword(vault, next); await forgetTodayKey(); const kept = await rememberTodayKey(session.key, toBase64(session.salt)); unlockDay.current = todayInTokyo(); setVault(session.state, session.key, session.salt); if (!kept) setAuthNotice('密码已修改；浏览器无法保存当天密钥，下次仍需输入密码。'); }} onDeleteVault={async () => { await forgetTodayKey(); localStorage.removeItem(VAULT_KEY); localStorage.removeItem('recomp.last-screen.v1'); unlockDay.current = null; setVault(null); setAuthNotice('本地保险库已删除。'); }} />
      </section>}
      {!['home', 'workout', 'settings', 'plans', 'nutrition'].includes(screen) && <p>此模块正在迁移。当前数据只保存在内存中，不会修改保险库。</p>}
    </main>
  </div>;
}
