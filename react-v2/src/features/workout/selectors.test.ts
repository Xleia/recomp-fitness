import { describe, expect, it } from 'vitest';
import { completedWorkload, listWorkoutRecords } from './selectors';

describe('workout history selectors', () => {
  it('counts only completed actual sets and never substitutes missing values', () => {
    const actual = {
      date: '2026-11-04',
      title: '背部',
      items: [{ name: '划船', sets: [
        { w: 40, r: 10, done: true },
        { w: 40, r: 8, done: true },
        { w: 100, r: 10, done: false },
        { w: null, r: 12, done: true },
        { r: 12, done: true },
      ] }],
    };
    expect(completedWorkload(actual)).toEqual({ completedSets: 4, volumeKg: 720 });
  });

  it('lists saved workout records by actual date and excludes malformed dates', () => {
    const records = listWorkoutRecords({
      newest: { date: '2026-11-04', items: [] },
      older: { date: '2026-11-02', items: [] },
      bad: { date: 'not-a-date', items: [] },
    });
    expect(records.map(({ key }) => key)).toEqual(['newest', 'older']);
  });
});
