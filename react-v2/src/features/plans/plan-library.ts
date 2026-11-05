import { parseTrainingPlan, type TrainingPlan } from './plan-data';

export const MAX_VERSIONS = 50;
export const MAX_PLAN_BYTES = 512 * 1024;
export const MAX_LIBRARY_BYTES = 2 * 1024 * 1024;
export interface PlanVersion { entry_id: string; imported_at: string; plan: TrainingPlan }
export interface PlanLibrary { schema_version: 1; versions: PlanVersion[]; active_entry_id: string | null }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function fail(message: string): never { throw new Error('计划版本库：' + message); }
function text(v: unknown, max = 80): v is string { return typeof v === 'string' && !!v.trim() && v.length <= max; }
function size(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value)).length; }

export function readPlanLibrary(vault: Record<string, unknown>): PlanLibrary {
  if (vault.plan_library === undefined) return { schema_version: 1, versions: [], active_entry_id: null };
  const value = vault.plan_library;
  if (!object(value) || Object.keys(value).some((key) => !['schema_version', 'versions', 'active_entry_id'].includes(key)) ||
      value.schema_version !== 1 || !Array.isArray(value.versions) || value.versions.length > MAX_VERSIONS ||
      (value.active_entry_id !== null && !text(value.active_entry_id))) fail('数据格式或版本数量无效');
  if (size(value) > MAX_LIBRARY_BYTES) fail('超过 2 MiB 限制');
  const ids = new Set<string>();
  const versions = value.versions.map((entry) => {
    if (!object(entry) || Object.keys(entry).some((key) => !['entry_id', 'imported_at', 'plan'].includes(key)) ||
        !text(entry.entry_id) || typeof entry.imported_at !== 'string' || ids.has(entry.entry_id)) fail('版本条目无效或 ID 重复');
    ids.add(entry.entry_id);
    const imported = new Date(entry.imported_at);
    if (!Number.isFinite(imported.valueOf()) || imported.toISOString() !== entry.imported_at) fail('导入时间无效');
    return { entry_id: entry.entry_id, imported_at: entry.imported_at, plan: parseTrainingPlan(entry.plan) };
  });
  return { schema_version: 1, versions, active_entry_id: value.active_entry_id as string | null };
}

export function hasDuplicatePlan(library: PlanLibrary, plan: TrainingPlan): boolean {
  return library.versions.some((entry) => entry.plan.plan_id === plan.plan_id && entry.plan.plan_version === plan.plan_version);
}
export function addPlanVersion(
  library: PlanLibrary, planInput: unknown, options: { entryId: string; importedAt: string; activate: boolean; allowDuplicate?: boolean },
): PlanLibrary {
  const plan = parseTrainingPlan(planInput);
  if (size(plan) > MAX_PLAN_BYTES) fail('单个计划超过 512 KiB');
  if (library.versions.length >= MAX_VERSIONS) fail('最多保存 50 个版本');
  if (hasDuplicatePlan(library, plan) && !options.allowDuplicate) fail('相同计划 ID 与版本已存在，请明确选择另存副本');
  if (!text(options.entryId) || library.versions.some((entry) => entry.entry_id === options.entryId)) fail('新版本 ID 重复或无效');
  const imported = new Date(options.importedAt);
  if (!Number.isFinite(imported.valueOf()) || imported.toISOString() !== options.importedAt) fail('导入时间无效');
  const result: PlanLibrary = {
    schema_version: 1,
    versions: [...library.versions, { entry_id: options.entryId, imported_at: options.importedAt, plan }],
    active_entry_id: options.activate ? options.entryId : library.active_entry_id,
  };
  if (size(result) > MAX_LIBRARY_BYTES) fail('计划库超过 2 MiB 限制');
  return result;
}
export function selectPlanVersion(library: PlanLibrary, entryId: string | null): PlanLibrary {
  if (entryId !== null && !library.versions.some((entry) => entry.entry_id === entryId)) fail('选择的版本不存在');
  return { ...library, active_entry_id: entryId };
}
