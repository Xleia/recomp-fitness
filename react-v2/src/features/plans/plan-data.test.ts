import { describe, expect, it } from 'vitest';
import raw from '../../public/plans/default-plan.json';
import { parseTrainingPlan, resolveTrainingPlan } from './plan-data';

describe('plan data compatibility', () => {
  it('loads all seven unmodified default-plan days and ordered exercises', () => {
    const plan = parseTrainingPlan(raw);
    expect(plan.plan_id).toBe('recomp-default');
    expect(plan.days.map((day) => day.weekday).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(plan.days.find((day) => day.weekday === 4)?.exercises[2].name).toBe('单臂绳索划船');
  });
  it('rejects duplicate weekdays and unsupported schema versions', () => {
    const dupe = structuredClone(raw);
    dupe.days[1].weekday = dupe.days[0].weekday;
    expect(() => parseTrainingPlan(dupe)).toThrow();
    expect(() => parseTrainingPlan({ ...raw, schema_version: 99 })).toThrow();
  });
  it('uses the default plan when an old vault has no plan library', () => {
    const fallback = parseTrainingPlan(raw);
    expect(resolveTrainingPlan({ workouts: {} }, fallback).plan).toEqual(fallback);
  });
});
