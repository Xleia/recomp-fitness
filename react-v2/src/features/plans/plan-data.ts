export interface PlanExercise {
  exercise_id: string; name: string; order: number; sets: number;
  reps: number | { min: number; max: number; per_side?: boolean };
  rest_seconds: number | { min: number; max: number };
  [key: string]: unknown;
}
export interface PlanDay {
  weekday: number; day_id: string; name: string; type: 'strength' | 'basketball' | 'cardio' | 'rest';
  muscle_groups: string[]; description?: string; home_description?: string; duration_minutes?: number; exercises: PlanExercise[]; [key: string]: unknown;
}
export interface TrainingPlan {
  format: 'recomp-training-plan'; schema_version: 1; plan_id: string; plan_version: string;
  name: string; goal: string; duration_weeks: number; description?: string;
  week_advice?: string[]; days: PlanDay[]; [key: string]: unknown;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const integer = (v: unknown, min: number, max: number) => Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
function validRange(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' ? integer(v, min, max) :
    object(v) && integer(v.min, min, max) && integer(v.max, min, max) && Number(v.min) <= Number(v.max);
}
export function parseTrainingPlan(input: unknown): TrainingPlan {
  if (!object(input) || input.format !== 'recomp-training-plan' || input.schema_version !== 1) {
    throw new Error('计划格式或 schema_version 不受支持');
  }
  if (!text(input.plan_id) || !text(input.plan_version) || !text(input.name) || !text(input.goal) ||
      !integer(input.duration_weeks, 1, 52) || !Array.isArray(input.days) || input.days.length !== 7) {
    throw new Error('计划基本信息或七天日程不完整');
  }
  const weekdays = new Set<number>(), dayIds = new Set<string>(), exerciseIds = new Set<string>();
  for (const day of input.days) {
    if (!object(day) || !integer(day.weekday, 0, 6) || !text(day.day_id) || !text(day.name) ||
        !['strength', 'basketball', 'cardio', 'rest'].includes(String(day.type)) ||
        !Array.isArray(day.muscle_groups) || !day.muscle_groups.every(text) || !Array.isArray(day.exercises)) {
      throw new Error('训练日字段无效');
    }
    if (weekdays.has(Number(day.weekday)) || dayIds.has(String(day.day_id))) throw new Error('训练日 ID 或星期重复');
    weekdays.add(Number(day.weekday)); dayIds.add(String(day.day_id));
    for (const exercise of day.exercises) {
      if (!object(exercise) || !text(exercise.exercise_id) || !text(exercise.name) ||
          !integer(exercise.order, 1, 200) || !integer(exercise.sets, 1, 100) ||
          !validRange(exercise.reps, 1, 1000) || !validRange(exercise.rest_seconds, 0, 3600)) {
        throw new Error('动作组数、次数或休息时间无效');
      }
      if (exerciseIds.has(String(exercise.exercise_id))) throw new Error('动作 ID 重复');
      exerciseIds.add(String(exercise.exercise_id));
    }
  }
  if (weekdays.size !== 7) throw new Error('每周必须包含星期一至星期日');
  return input as unknown as TrainingPlan;
}
export async function loadDefaultPlan(): Promise<TrainingPlan> {
  const response = await fetch(new URL('plans/default-plan.json', import.meta.env.BASE_URL));
  if (!response.ok) throw new Error('系统默认训练计划加载失败');
  return parseTrainingPlan(await response.json());
}
export function resolveTrainingPlan(vault: Record<string, unknown>, fallback: TrainingPlan | null) {
  const library = vault.plan_library;
  if (object(library) && Array.isArray(library.versions) && typeof library.active_entry_id === 'string') {
    const active = library.versions.find((item) => object(item) && item.entry_id === library.active_entry_id);
    if (object(active)) {
      try { return { plan: parseTrainingPlan(active.plan), imported: true, warning: null as string | null }; }
      catch { return { plan: fallback, imported: false, warning: '当前导入计划异常，正在显示系统默认计划。' }; }
    }
    if (library.active_entry_id) return { plan: fallback, imported: false, warning: '启用计划版本不存在，正在显示系统默认计划。' };
  }
  return { plan: fallback, imported: false, warning: null as string | null };
}
export function weekdayName(day: number): string {
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][day] ?? '';
}
export function repsLabel(value: PlanExercise['reps']): string {
  if (typeof value === 'number') return String(value) + ' 次';
  return value.min + '–' + value.max + ' 次' + (value.per_side ? ' / 每侧' : '');
}
export function restLabel(value: PlanExercise['rest_seconds']): string {
  return typeof value === 'number' ? value + ' 秒' : value.min + '–' + value.max + ' 秒';
}
