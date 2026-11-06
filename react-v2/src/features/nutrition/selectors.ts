import type { RecompState } from '../../types/state';

export const MEAL_NAMES = ['早餐', '午餐', '加餐 / 运动补给', '晚餐'];
export type MacroKey = 'kcal' | 'protein' | 'fat' | 'carbs';
export type NutritionValues = Record<MacroKey, number | null>;
export interface FoodEntry {
  name?: string; amount?: number; unit?: string;
  snap?: Partial<Record<MacroKey, number>>; [key: string]: unknown;
}
export interface NutritionDay {
  date: string;
  entries: Array<Record<string, unknown>>;
  foodItems: FoodEntry[][];
  totals: NutritionValues;
}
const keys: MacroKey[] = ['kcal', 'protein', 'fat', 'carbs'];
const validDate = (date: unknown): date is string =>
  typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
function finiteMacro(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function dayFromUnknown(date: string, value: unknown): NutritionDay {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const entries = Array.isArray(record.entries) ? record.entries.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];
  const foods = Array.isArray(record.foodItems) ? record.foodItems : [];
  const foodItems = Array.from({ length: 4 }, (_, i) =>
    Array.isArray(foods[i]) ? foods[i].filter((x): x is FoodEntry => !!x && typeof x === 'object') : []);
  const totals = Object.fromEntries(keys.map((key) => [key, sumPresent(entries, foodItems.flat(), key)])) as NutritionValues;
  return { date, entries, foodItems, totals };
}
function sumPresent(entries: Array<Record<string, unknown>>, foods: FoodEntry[], key: MacroKey): number | null {
  const values: number[] = [];
  for (const entry of entries) {
    const value = finiteMacro(entry[key]);
    if (value !== null) values.push(value);
  }
  for (const food of foods) {
    const value = finiteMacro(food.snap?.[key]);
    if (value !== null) values.push(value);
  }
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100 : null;
}
export function listNutritionDays(nutrition: RecompState['nutrition']): NutritionDay[] {
  return Object.entries(nutrition)
    .filter(([date]) => validDate(date))
    .map(([date, value]) => dayFromUnknown(date, value))
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function formatMacro(value: number | null, unit: string): string {
  return value === null ? '—' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value) + ' ' + unit;
}
