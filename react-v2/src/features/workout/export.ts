import type { WorkoutRecord, WorkoutSet } from '../../types/state';
import { listWorkoutRecords } from './selectors';

const sensitiveKey = /^(password|passwd|passphrase|pass|pwd|pin|secret|clientsecret|key|keyref|saltref|salt|iv|aad|ciphertext|encryptionkey|cryptokey|privatekey|publickey|apikey|token|accesstoken|refreshtoken|idtoken|authorization|credentials|credential|auth|authentication|cookie|sessionid)$/i;
export interface DateRange { startDate?: string; endDate?: string }
export interface TrainingExport {
  format: 'recomp-training-export';
  schema_version: 1;
  exported_at: string;
  date_range: { start_date: string | null; end_date: string | null };
  record_count: number;
  records: WorkoutRecord[];
}

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !sensitiveKey.test(key))
      .map(([key, child]) => [key, clean(child)]));
  }
  return value;
}
function validateDate(value: string | undefined): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日期格式无效，请使用 YYYY-MM-DD');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('日期不存在，请检查开始日期和结束日期');
  }
  return value;
}
export function normalizeRange(range: DateRange): { startDate: string | null; endDate: string | null } {
  const startDate = validateDate(range.startDate);
  const endDate = validateDate(range.endDate);
  if (startDate && endDate && startDate > endDate) throw new Error('开始日期不能晚于结束日期');
  return { startDate, endDate };
}
export function selectExportRecords(workouts: Record<string, WorkoutRecord>, range: DateRange = {}) {
  const bounds = normalizeRange(range);
  return listWorkoutRecords(workouts).filter(({ record }) =>
    (!bounds.startDate || String(record.date) >= bounds.startDate) &&
    (!bounds.endDate || String(record.date) <= bounds.endDate),
  );
}
export function createTrainingExport(
  workouts: Record<string, WorkoutRecord>,
  range: DateRange = {},
  now = new Date(),
): TrainingExport {
  const bounds = normalizeRange(range);
  const records = selectExportRecords(workouts, range).map(({ record }) => clean(record) as WorkoutRecord);
  return {
    format: 'recomp-training-export',
    schema_version: 1,
    exported_at: now.toISOString(),
    date_range: { start_date: bounds.startDate, end_date: bounds.endDate },
    record_count: records.length,
    records,
  };
}
const csvFields = [
  'date', 'day', 'workout_title', 'body_parts', 'exercise', 'exercise_order', 'set_number',
  'weight_kg', 'reps', 'done', 'rpe', 'rir', 'rest_seconds', 'duration_seconds', 'workout_note',
  'set_extra_json', 'exercise_extra_json', 'workout_extra_json',
] as const;
function csvCell(value: unknown): string {
  const text = value == null ? '' : typeof value === 'string' ? value :
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}
function without(value: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key) && !sensitiveKey.test(key)));
}
export function trainingExportCsv(payload: TrainingExport): string {
  const lines = [csvFields.join(',')];
  payload.records.forEach((record) => {
    (record.items ?? []).forEach((item, exerciseIndex) => {
      (item.sets ?? []).forEach((set: WorkoutSet, setIndex) => {
        const row: unknown[] = [
          record.date, record.day, record.title ?? record.name,
          record.bodyParts, item.name, exerciseIndex + 1, setIndex + 1,
          set.w, set.r, set.done, set.rpe, set.rir, set.rest_seconds, set.duration_seconds,
          record.note ?? record.notes,
          without(set, ['w', 'r', 'done', 'rpe', 'rir', 'rest_seconds', 'duration_seconds']),
          without(item, ['name', 'sets', 'exercise_id']),
          without(record, ['date', 'day', 'title', 'name', 'bodyParts', 'items', 'note', 'notes']),
        ];
        lines.push(row.map(csvCell).join(','));
      });
    });
  });
  // UTF-8 BOM makes Chinese and Japanese readable in desktop Excel.
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

function fileDate(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
export async function saveTrainingExport(
  kind: 'json' | 'csv',
  payload: TrainingExport,
  now = new Date(),
): Promise<string> {
  const extension = kind;
  const filename = 'RECOMP_training_export_' + fileDate(now) + '.' + extension;
  const body = kind === 'json' ? JSON.stringify(payload, null, 2) : trainingExportCsv(payload);
  const type = kind === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8';
  const file = new File([body], filename, { type });
  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return filename;
  }
  const url = URL.createObjectURL(file);
  try {
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.style.display = 'none';
    document.body.appendChild(link); link.click(); link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return filename;
}
