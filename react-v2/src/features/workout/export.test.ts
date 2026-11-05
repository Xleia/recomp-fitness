import { describe, expect, it } from 'vitest';
import { createTrainingExport, normalizeRange, selectExportRecords, trainingExportCsv } from './export';

const workouts = {
  '2026-11-01': { date: '2026-11-01', title: '胸部', items: [{ name: '卧推', sets: [{ w: 50, r: 8, done: true, rpe: 8 }, { w: 50, r: 8, done: false }] }], notes: '保留备注', apiKey: 'must-not-export' },
  '2026-11-03': { date: '2026-11-03', title: '背部', items: [{ name: '划船', sets: [{ w: 40, r: 10, done: true }] }] },
};
describe('training record export', () => {
  it('exports actual records in a parseable envelope and excludes auth fields', () => {
    const result = createTrainingExport(workouts, {}, new Date('2026-11-05T00:00:00.000Z'));
    expect(JSON.parse(JSON.stringify(result))).toMatchObject({
      format: 'recomp-training-export', schema_version: 1, record_count: 2,
      exported_at: '2026-11-05T00:00:00.000Z',
    });
    expect(JSON.stringify(result)).not.toContain('must-not-export');
    expect(result.records[0].notes).toBe('保留备注');
  });
  it('filters inclusive date ranges and rejects invalid ranges', () => {
    expect(selectExportRecords(workouts, { startDate: '2026-11-02', endDate: '2026-11-03' })).toHaveLength(1);
    expect(() => normalizeRange({ startDate: '2026-11-10', endDate: '2026-11-01' })).toThrow();
    expect(() => normalizeRange({ startDate: '2026-02-30' })).toThrow();
  });
  it('emits UTF-8 BOM CSV with a row per set and preserves completion state', () => {
    const payload = createTrainingExport(workouts);
    const csv = trainingExportCsv(payload);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.split('\r\n').length).toBe(4);
    expect(csv).toContain('"卧推"');
    expect(csv).toContain('"false"');
    expect(csv).toContain('"保留备注"');
  });
});
