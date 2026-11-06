import { describe, expect, it } from 'vitest';
import raw from '../../../public/plans/default-plan.json';
import { addPlanVersion, hasDuplicatePlan, readPlanLibrary, selectPlanVersion } from './plan-library';
import { parseTrainingPlan } from './plan-data';

describe('encrypted plan version library model', () => {
  it('treats missing library as the old-vault default and keeps old versions', () => {
    const old = readPlanLibrary({ workouts: {} });
    expect(old).toEqual({ schema_version: 1, versions: [], active_entry_id: null });
    const plan = parseTrainingPlan(raw);
    const next = addPlanVersion(old, plan, { entryId: 'entry-1', importedAt: '2026-11-05T00:00:00.000Z', activate: true });
    expect(readPlanLibrary({ plan_library: next }).active_entry_id).toBe('entry-1');
    expect(selectPlanVersion(next, null).versions).toHaveLength(1);
  });
  it('requires explicit consent to save duplicate plan identity as another version', () => {
    const plan = parseTrainingPlan(raw), library = readPlanLibrary({});
    const first = addPlanVersion(library, plan, { entryId: 'entry-1', importedAt: '2026-11-05T00:00:00.000Z', activate: false });
    expect(hasDuplicatePlan(first, plan)).toBe(true);
    expect(() => addPlanVersion(first, plan, { entryId: 'entry-2', importedAt: '2026-11-05T00:00:00.000Z', activate: false })).toThrow();
    expect(addPlanVersion(first, plan, { entryId: 'entry-2', importedAt: '2026-11-05T00:00:00.000Z', activate: false, allowDuplicate: true }).versions).toHaveLength(2);
  });
  it('rejects malformed or oversized plan library data', () => {
    expect(() => readPlanLibrary({ plan_library: { schema_version: 1, versions: [{ entry_id: 'a', imported_at: 'bad', plan: raw }], active_entry_id: null } })).toThrow();
    expect(() => selectPlanVersion(readPlanLibrary({}), 'missing')).toThrow();
  });
});
