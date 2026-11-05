import type { RecompState } from '../types/state';

export const VAULT_KEY = 'recomp.encrypted.v2';
const VERSION = 2;
const ITERATIONS = 600_000;
const AAD = new TextEncoder().encode('RECOMP|encrypted-vault|v2');
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface VaultEnvelope {
  format: 'recomp-encrypted-vault';
  version: 2;
  kdf: 'PBKDF2-SHA256';
  iterations: 600000;
  cipher: 'AES-256-GCM';
  salt: string;
  iv: string;
  ciphertext: string;
}
export const toBase64 = (data: Uint8Array) => {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary);
};
export const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export function parseEnvelope(input: string | unknown): VaultEnvelope {
  const value = typeof input === 'string' ? JSON.parse(input) : input;
  if (!value || typeof value !== 'object') throw new Error('备份格式不正确');
  const env = value as Partial<VaultEnvelope>;
  if (env.format !== 'recomp-encrypted-vault' || env.version !== VERSION ||
      env.kdf !== 'PBKDF2-SHA256' || env.cipher !== 'AES-256-GCM' ||
      env.iterations !== ITERATIONS) throw new Error('不是受支持的 RECOMP 加密备份');
  for (const [field, min, max] of [['salt', 20, 100], ['iv', 12, 70], ['ciphertext', 20, 15_000_000]] as const) {
    const encoded = env[field];
    if (typeof encoded !== 'string' || encoded.length < min || encoded.length > max ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error('备份格式不正确');
  }
  if (fromBase64(env.salt!).length !== 16 || fromBase64(env.iv!).length !== 12) {
    throw new Error('备份的加密参数不正确');
  }
  return env as VaultEnvelope;
}

async function deriveKey(password: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
}
function assertCompatibleState(value: unknown): asserts value is RecompState {
  if (!value || typeof value !== 'object') throw new Error('加密备份里的数据格式不正确');
  const state = value as Partial<RecompState>;
  if (!state.profile || typeof state.profile !== 'object' ||
      !state.settings || typeof state.settings !== 'object' ||
      !state.nutrition || typeof state.nutrition !== 'object' ||
      !state.workouts || typeof state.workouts !== 'object' ||
      !Array.isArray(state.measurements)) throw new Error('加密备份里的数据格式不正确');
  if (state.measurements.length > 5000 || Object.keys(state.workouts).length > 10000 ||
      Object.keys(state.nutrition).length > 10000) throw new Error('备份数据超过安全限制');
}

export async function decryptVault(envelope: VaultEnvelope, password: string): Promise<RecompState> {
  const key = await deriveKey(password, fromBase64(envelope.salt));
  const bytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.iv), additionalData: AAD, tagLength: 128 },
    key, fromBase64(envelope.ciphertext),
  );
  const value: unknown = JSON.parse(dec.decode(bytes));
  assertCompatibleState(value);
  // Unknown fields are deliberately kept intact for forward/backward compatibility.
  return value;
}

export async function readEncryptedVault(storage: Storage = localStorage): Promise<VaultEnvelope | null> {
  const raw = storage.getItem(VAULT_KEY);
  return raw ? parseEnvelope(raw) : null;
}
