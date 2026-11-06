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
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt', 'encrypt'],
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

export interface VaultSession {
  state: RecompState;
  key: CryptoKey;
  salt: Uint8Array;
}
export async function unlockEncryptedVault(envelope: VaultEnvelope, password: string): Promise<VaultSession> {
  const salt = fromBase64(envelope.salt);
  const key = await deriveKey(password, salt);
  const bytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.iv), additionalData: AAD, tagLength: 128 },
    key, fromBase64(envelope.ciphertext),
  );
  const value: unknown = JSON.parse(dec.decode(bytes));
  assertCompatibleState(value);
  return { state: value, key, salt };
}

export async function unlockWithKey(envelope:VaultEnvelope,key:CryptoKey):Promise<VaultSession>{const salt=fromBase64(envelope.salt);const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(envelope.iv),additionalData:AAD,tagLength:128},key,fromBase64(envelope.ciphertext));const value:unknown=JSON.parse(dec.decode(bytes));assertCompatibleState(value);return{state:value,key,salt};}
export async function decryptVault(envelope: VaultEnvelope, password: string): Promise<RecompState> {
  return (await unlockEncryptedVault(envelope, password)).state;
}
export async function persistEncryptedVault(
  state: RecompState, key: CryptoKey, salt: Uint8Array, storage: Storage = localStorage,
): Promise<void> {
  assertCompatibleState(state);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: AAD, tagLength: 128 },
    key, enc.encode(JSON.stringify(state)),
  );
  const envelope: VaultEnvelope = {
    format: 'recomp-encrypted-vault', version: 2, kdf: 'PBKDF2-SHA256',
    iterations: 600000, cipher: 'AES-256-GCM',
    salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(bytes)),
  };
  // One localStorage setItem replaces the envelope atomically; caller updates memory only after success.
  storage.setItem(VAULT_KEY, JSON.stringify(envelope));
}


export async function reencryptVaultWithPassword(state:RecompState,password:string,storage:Storage=localStorage):Promise<VaultSession>{if(password.length<12||password.length>200)throw new Error('新密码长度需为12～200个字符');assertCompatibleState(state);const salt=crypto.getRandomValues(new Uint8Array(16)),key=await deriveKey(password,salt),iv=crypto.getRandomValues(new Uint8Array(12)),bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD,tagLength:128},key,enc.encode(JSON.stringify(state)));const envelope:VaultEnvelope={format:'recomp-encrypted-vault',version:2,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:toBase64(salt),iv:toBase64(iv),ciphertext:toBase64(new Uint8Array(bytes))};storage.setItem(VAULT_KEY,JSON.stringify(envelope));return{state,key,salt};}
export async function readEncryptedVault(storage: Storage = localStorage): Promise<VaultEnvelope | null> {
  const raw = storage.getItem(VAULT_KEY);
  return raw ? parseEnvelope(raw) : null;
}

export function encryptedBackupJson(storage: Storage = localStorage): string {
  const raw = storage.getItem(VAULT_KEY);
  if (!raw) throw new Error('当前没有可导出的加密保险库');
  return JSON.stringify(parseEnvelope(raw), null, 2);
}
export async function restoreEncryptedBackup(
  raw: string,
  password: string,
  storage: Storage = localStorage,
  confirmReplace: () => boolean | Promise<boolean> = () => false,
): Promise<VaultSession | null> {
  const size = new TextEncoder().encode(raw).length;
  if (size > 8 * 1024 * 1024 || size < 100) throw new Error('备份文件体积异常');
  if (!password) throw new Error('请输入备份密码');
  const envelope = parseEnvelope(raw);
  let session: VaultSession;
  try { session = await unlockEncryptedVault(envelope, password); }
  catch { throw new Error('备份密码错误或文件已损坏'); }
  if (!await confirmReplace()) return null;
  // Restore the original envelope unchanged. A failed write leaves current in-memory state untouched.
  storage.setItem(VAULT_KEY, JSON.stringify(envelope));
  return session;
}
