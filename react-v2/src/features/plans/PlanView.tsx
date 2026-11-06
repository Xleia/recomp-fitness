import type { TrainingPlan } from './plan-data';
import { repsLabel, restLabel, weekdayName } from './plan-data';

export function PlanView({ plan, imported, warning }: { plan: TrainingPlan | null; imported: boolean; warning: string | null }) {
  if (!plan) return <section><h2>训练计划</h2><p role="alert">{warning || '默认计划尚未加载。请检查网络后重新打开。'}</p></section>;
  const days = [...plan.days].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
  return <section aria-label="训练计划">
    <p>{imported ? '当前启用的已保存计划' : '系统默认计划'} · v{plan.plan_version}</p>
    {warning && <p role="status">{warning}</p>}
    <h2>{plan.name}</h2><p>{plan.goal} · {plan.duration_weeks} 周</p>
    {plan.description && <p>{plan.description}</p>}
    {plan.week_advice && <details><summary>周期建议</summary><ol>{plan.week_advice.map((tip, index) => <li key={index}>{tip}</li>)}</ol></details>}
    {days.map((day) => <article className="workout-card" key={day.day_id}>
      <h3>{weekdayName(day.weekday)} · {day.name}</h3>
      <p>{day.type} · {day.muscle_groups.join(' / ') || '恢复日'}</p>
      {day.description && <p>{day.description}</p>}
      {day.exercises.length === 0 ? <p>当天无动作安排</p> : <ol>{[...day.exercises].sort((a, b) => a.order - b.order).map((exercise) =>
        <li key={exercise.exercise_id}>{exercise.name} — {exercise.sets} 组 × {repsLabel(exercise.reps)}；休息 {restLabel(exercise.rest_seconds)}
          {exercise.rir !== undefined ? '；RIR ' + String(typeof exercise.rir === 'object' ? JSON.stringify(exercise.rir) : exercise.rir) : ''}
        </li>)}</ol>}
    </article>)}
  </section>;
}
