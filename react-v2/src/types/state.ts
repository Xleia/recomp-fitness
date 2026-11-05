export interface WorkoutSet {
  w?: number;
  r?: number;
  done?: boolean;
  [key: string]: unknown;
}
export interface WorkoutItem {
  name?: string;
  sets?: WorkoutSet[];
  [key: string]: unknown;
}
export interface WorkoutRecord {
  date?: string;
  day?: number;
  title?: string;
  name?: string;
  items?: WorkoutItem[];
  [key: string]: unknown;
}
export interface RecompState {
  schema?: number;
  profile: Record<string, unknown>;
  settings: Record<string, unknown>;
  measurements: Array<Record<string, unknown>>;
  workouts: Record<string, WorkoutRecord>;
  nutrition: Record<string, unknown>;
  [key: string]: unknown;
}
