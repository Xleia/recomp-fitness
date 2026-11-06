import type { WorkoutRecord, WorkoutSet } from '../../types/state';

export interface WorkoutEntry { key: string; record: WorkoutRecord }
export interface CompletedWorkload { completedSets: number; volumeKg: number }

const validDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function listWorkoutRecords(workouts: Record<string, WorkoutRecord>): WorkoutEntry[] {
  return Object.entries(workouts)
    .filter(([, record]) => !!record && typeof record === 'object' && validDate(record.date))
    .map(([key, record]) => ({ key, record }))
    .sort((a, b) => String(b.record.date).localeCompare(String(a.record.date)) || a.key.localeCompare(b.key));
}

export function completedWorkload(record: WorkoutRecord): CompletedWorkload {
  let completedSets = 0;
  let volumeKg = 0;
  for (const item of record.items ?? []) {
    for (const set of item.sets ?? []) {
      if (set.done !== true) continue;
      completedSets += 1;
      const weight = finiteNonNegative(set.w);
      const reps = finiteNonNegative(set.r);
      if (weight !== null && reps !== null) volumeKg += weight * reps;
    }
  }
  return { completedSets, volumeKg };
}

export function finiteNonNegative(value: WorkoutSet['w']): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function formatWorkload(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value);
}
