import type { RecompState } from '../../types/state';

export interface PlanExercise {
  exercise_id: string; name: string; order: number; sets: number;
  reps: number | { min: number; max: number; per_side?: boolean };
  rest_seconds: number | { min: number; max: number };
  [key: string]: unknown;
}
export interface PlanDay {
  weekday: number; day_id: string; name: string;
  type: 'strength' | 'basketball' | 'cardio' | 'rest';
  muscle_groups: string[]; description?: string; home_description?: string;
  duration_minutes?: number; exercises: PlanExercise[]; [key: string]: unknown;
}
export interface TrainingPlan {
  format: 'recomp-training-plan'; schema_version: 1; plan_id: string; plan_version: string;
  name: string; goal: string; duration_weeks: number; description?: string;
  week_advice?: string[]; days: PlanDay[];
  weeks?: Array<{ week: number; days: PlanDay[] }>;
  [key: string]: unknown;
}
const types = ['strength', 'basketball', 'cardio', 'rest'];
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function fail(path: string, reason: string): never { throw new Error('训练计划 ' + path + '：' + reason); }
function keys(value: unknown, allowed: string[], path: string): asserts value is Record<string, unknown> {
  if (!object(value)) fail(path, '必须为对象');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path + '.' + key, '不支持的字段');
}
function string(value: unknown, path: string, max?: number, optional?: false): asserts value is string;
function string(value: unknown, path: string, max: number, optional: true): asserts value is string | undefined;
function string(value: unknown, path: string, max = 500, optional = false): asserts value is string | undefined {
  if (optional && value === undefined) return;
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(path, '文本长度或内容无效');
}
function number(value: unknown, path: string, min: number, max: number, integer = false): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(path, '数值超出允许范围');
}
function id(value: unknown, path: string): asserts value is string {
  string(value, path, 64);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) fail(path, 'ID 格式无效');
}
function interval(value: unknown, path: string, min: number, max: number, integer = false, perSide = false): void {
  if (typeof value === 'number') { number(value, path, min, max, integer); return; }
  keys(value, perSide ? ['min', 'max', 'per_side'] : ['min', 'max'], path);
  number(value.min, path + '.min', min, max, integer); number(value.max, path + '.max', min, max, integer);
  if (value.min > value.max) fail(path, '最小值不能大于最大值');
  if (own(value, 'per_side') && typeof value.per_side !== 'boolean') fail(path + '.per_side', '必须为布尔值');
}
function textArray(value: unknown, path: string, max = 20): asserts value is string[] {
  if (!Array.isArray(value) || value.length > max) fail(path, '文本列表数量无效');
  value.forEach((item, index) => string(item, path + '[' + index + ']', 200));
}
function validateDays(value: unknown, path: string, full: boolean): asserts value is PlanDay[] {
  if (!Array.isArray(value) || value.length > 7 || value.length < (full ? 7 : 1)) fail(path, full ? '必须包含完整七天安排' : '必须包含 1–7 天安排');
  const weekdays = new Set<number>(), dayIds = new Set<string>(), exerciseIds = new Set<string>();
  value.forEach((day, index) => {
    const p = path + '[' + index + ']';
    keys(day, ['weekday', 'day_id', 'name', 'type', 'muscle_groups', 'description', 'home_description', 'duration_minutes', 'exercises'], p);
    number(day.weekday, p + '.weekday', 0, 6, true);
    if (weekdays.has(day.weekday as number)) fail(p, '星期重复');
    weekdays.add(day.weekday as number);
    id(day.day_id, p + '.day_id');
    if (dayIds.has(day.day_id)) fail(p, '训练日 ID 重复');
    dayIds.add(day.day_id);
    string(day.name, p + '.name', 100);
    if (!types.includes(String(day.type))) fail(p + '.type', '训练类型无效');
    textArray(day.muscle_groups, p + '.muscle_groups');
    string(day.description, p + '.description', 2000, true);
    string(day.home_description, p + '.home_description', 2000, true);
    if (own(day, 'duration_minutes')) number(day.duration_minutes, p + '.duration_minutes', 1, 1440, true);
    if (!Array.isArray(day.exercises) || day.exercises.length > 40 ||
        (day.type === 'strength' && !day.exercises.length) || (day.type === 'rest' && day.exercises.length)) fail(p + '.exercises', '动作数量与训练日类型不匹配');
    const orders = new Set<number>();
    day.exercises.forEach((exercise, exIndex) => {
      const ep = p + '.exercises[' + exIndex + ']';
      keys(exercise, ['exercise_id', 'name', 'order', 'sets', 'reps', 'planned_weight_kg', 'rest_seconds', 'rpe', 'rir', 'description', 'alternatives'], ep);
      id(exercise.exercise_id, ep + '.exercise_id');
      if (exerciseIds.has(exercise.exercise_id)) fail(ep, '动作 ID 重复');
      exerciseIds.add(exercise.exercise_id);
      string(exercise.name, ep + '.name', 100);
      number(exercise.order, ep + '.order', 1, 40, true);
      if (orders.has(exercise.order as number)) fail(ep, '动作顺序重复');
      orders.add(exercise.order as number);
      number(exercise.sets, ep + '.sets', 1, 20, true);
      interval(exercise.reps, ep + '.reps', 1, 1000, true, true);
      interval(exercise.rest_seconds, ep + '.rest_seconds', 0, 3600, true);
      if (own(exercise, 'planned_weight_kg')) number(exercise.planned_weight_kg, ep + '.planned_weight_kg', 0, 1000);
      if (own(exercise, 'rpe')) interval(exercise.rpe, ep + '.rpe', 1, 10);
      if (own(exercise, 'rir')) interval(exercise.rir, ep + '.rir', 0, 20);
      string(exercise.description, ep + '.description', 2000, true);
      if (own(exercise, 'alternatives')) textArray(exercise.alternatives, ep + '.alternatives');
    });
  });
}
export function parseTrainingPlan(source: unknown): TrainingPlan {
  let plan: unknown;
  try {
    const serialized = JSON.stringify(source);
    if (typeof serialized !== 'string') fail('文件', '不是有效 JSON 对象');
    if (new TextEncoder().encode(serialized).length > 512 * 1024) fail('文件', '超过 512 KiB 限制');
    plan = JSON.parse(serialized);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('训练计划')) throw error;
    fail('文件', '不是有效 JSON 对象');
  }
  keys(plan, ['format', 'schema_version', 'plan_id', 'plan_version', 'name', 'goal', 'duration_weeks', 'description', 'week_advice', 'days', 'weeks'], '根对象');
  if (plan.format !== 'recomp-training-plan') fail('format', '应为 recomp-training-plan');
  if (plan.schema_version !== 1) fail('schema_version', '仅支持版本 1');
  id(plan.plan_id, 'plan_id');
  string(plan.plan_version, 'plan_version', 64); string(plan.name, 'name', 100); string(plan.goal, 'goal', 500);
  number(plan.duration_weeks, 'duration_weeks', 1, 104, true);
  string(plan.description, 'description', 3000, true);
  validateDays(plan.days, 'days', true);
  if (own(plan, 'week_advice')) {
    textArray(plan.week_advice, 'week_advice', 104);
    if ((plan.week_advice as string[]).length > (plan.duration_weeks as number)) fail('week_advice', '建议条目超过计划周数');
  }
  if (own(plan, 'weeks')) {
    if (!Array.isArray(plan.weeks) || plan.weeks.length > (plan.duration_weeks as number)) fail('weeks', '周次配置无效');
    const used = new Set<number>();
    for (const [index, week] of plan.weeks.entries()) {
      const path = 'weeks[' + index + ']';
      keys(week, ['week', 'days'], path);
      number(week.week, path + '.week', 1, plan.duration_weeks as number, true);
      if (used.has(week.week as number)) fail(path, '周次重复');
      used.add(week.week as number);
      validateDays(week.days, path + '.days', false);
      const replacements = new Map((week.days as PlanDay[]).map((day) => [day.weekday, day]));
      validateDays((plan.days as PlanDay[]).map((day) => replacements.get(day.weekday) || day), path + '.resolved_days', true);
    }
  }
  return plan as TrainingPlan;
}
export async function loadDefaultPlan(): Promise<TrainingPlan> {
  const response = await fetch(new URL('plans/default-plan.json', window.location.origin + import.meta.env.BASE_URL));
  if (!response.ok) throw new Error('系统默认训练计划加载失败');
  return parseTrainingPlan(await response.json());
}
export function resolveTrainingPlan(vault: Record<string, unknown> | RecompState, fallback: TrainingPlan | null) {
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
