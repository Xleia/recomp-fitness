import { describe, expect, it } from 'vitest';
import { formatMacro, listNutritionDays } from './selectors';

describe('nutrition history selectors', () => {
  it('combines saved manual meals and food snapshots without changing the source', () => {
    const saved = {
      '2026-11-04': {
        date: '2026-11-04',
        entries: [{ kcal: 400, protein: 20, fat: null, carbs: 40 }, { kcal: 300, protein: 15 }],
        foodItems: [[{ name: '燕麦', amount: 60, unit: 'g', snap: { kcal: 220, protein: 8 } }]],
      },
    };
    const days = listNutritionDays(saved as never);
    expect(days[0].totals).toEqual({ kcal: 920, protein: 43, fat: null, carbs: 40 });
    expect(saved['2026-11-04'].entries[0].fat).toBe(null);
  });
  it('orders by date and shows unknown nutrition as blank marker', () => {
    const days = listNutritionDays({ '2026-01-02': {}, bad: {}, '2026-01-01': { entries: [{ kcal: 0 }] } } as never);
    expect(days.map((day) => day.date)).toEqual(['2026-01-02', '2026-01-01']);
    expect(formatMacro(days[1].totals.kcal, 'kcal')).toBe('0 kcal');
    expect(formatMacro(null, 'g')).toBe('—');
  });
});
