import type { NutritionDay } from './selectors';
import { formatMacro, MEAL_NAMES } from './selectors';

export function NutritionHistory({ days }: { days: NutritionDay[] }) {
  if (!days.length) return <section aria-label="饮食记录"><h2>饮食历史</h2><p>当前保险库没有饮食记录。</p></section>;
  return <section aria-label="饮食记录"><p>只读历史记录 · {days.length} 天。未记录的营养值显示为“—”。</p>
    {days.map((day) => <article className="workout-card" key={day.date}>
      <h2>{day.date}</h2>
      <p>{formatMacro(day.totals.kcal, 'kcal')} · 蛋白质 {formatMacro(day.totals.protein, 'g')} · 脂肪 {formatMacro(day.totals.fat, 'g')} · 碳水 {formatMacro(day.totals.carbs, 'g')}</p>
      {MEAL_NAMES.map((meal, index) => {
        const manual = day.entries[index] ?? {};
        const foods = day.foodItems[index] ?? [];
        const hasManual = ['kcal', 'protein', 'fat', 'carbs'].some((key) => manual[key] !== undefined && manual[key] !== null) || !!manual.note;
        if (!hasManual && foods.length === 0) return null;
        return <details key={meal}><summary>{meal}</summary>
          {hasManual && <p>手动记录：{formatMacro(typeof manual.kcal === 'number' ? manual.kcal : null, 'kcal')} · 蛋白质 {formatMacro(typeof manual.protein === 'number' ? manual.protein : null, 'g')} · 脂肪 {formatMacro(typeof manual.fat === 'number' ? manual.fat : null, 'g')} · 碳水 {formatMacro(typeof manual.carbs === 'number' ? manual.carbs : null, 'g')}</p>}
          {typeof manual.note === 'string' && manual.note && <p>备注：{manual.note}</p>}
          {foods.length > 0 && <ul>{foods.map((food, i) => <li key={String(food.id ?? i)}>
            {food.name || '食品'} · {food.amount == null ? '份量未记录' : String(food.amount) + ' ' + String(food.unit ?? 'g')}
            {food.snap && <span> · {formatMacro(typeof food.snap.kcal === 'number' ? food.snap.kcal : null, 'kcal')} · 蛋白质 {formatMacro(typeof food.snap.protein === 'number' ? food.snap.protein : null, 'g')}</span>}
          </li>)}</ul>}
        </details>;
      })}
    </article>)}
  </section>;
}
