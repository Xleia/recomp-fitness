import { describe, expect, it } from 'vitest';
import { decryptVault, parseEnvelope, encryptedBackupJson, persistEncryptedVault, restoreEncryptedBackup, toBase64, unlockEncryptedVault, reencryptVaultWithPassword } from './vault';

const aad = new TextEncoder().encode('RECOMP|encrypted-vault|v2');
const encoder = new TextEncoder();
async function legacyEnvelope(value: unknown) {
  const salt = new Uint8Array(16).fill(7);
  const iv = new Uint8Array(12).fill(9);
  const base = await crypto.subtle.importKey('raw', encoder.encode('test-only password'), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, encoder.encode(JSON.stringify(value)),
  );
  return {
    format: 'recomp-encrypted-vault' as const, version: 2 as const, kdf: 'PBKDF2-SHA256' as const,
    iterations: 600000 as const, cipher: 'AES-256-GCM' as const, salt: toBase64(salt), iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

class MemoryStorage implements Storage { data=new Map<string,string>(); get length(){return this.data.size} clear(){this.data.clear()} key(i:number){return [...this.data.keys()][i]??null} getItem(k:string){return this.data.get(k)??null} removeItem(k:string){this.data.delete(k)} setItem(k:string,v:string){this.data.set(k,String(v))} }

describe('legacy encrypted vault compatibility', () => {

  it('changes the vault password by re-encrypting without altering the state', async () => {
    const state={schema:2,profile:{},settings:{},measurements:[],workouts:{},nutrition:{},keep:{value:1}};
    const storage=new MemoryStorage();
    const next=await reencryptVaultWithPassword(state,'new secure password',storage);
    expect(await decryptVault(parseEnvelope(storage.getItem('recomp.encrypted.v2')!), 'new secure password')).toEqual(state);
    await expect(decryptVault(parseEnvelope(storage.getItem('recomp.encrypted.v2')!), 'test-only password')).rejects.toThrow();
    expect(next.state).toEqual(state);
  });
  it('decrypts an AES-GCM vault without dropping unrecognized fields', async () => {
    const state = {
      schema: 2, profile: { created: '2026-01-01' }, settings: { start: '2026-01-05' },
      measurements: [{ date: '2026-01-01', weight: 70 }], workouts: { day1: { date: '2026-01-01', items: [] } },
      nutrition: {}, legacyHistory: [], plan_library: [{ id: 'saved-plan' }], futureOptionalValue: { preserved: true },
    };
    const opened = await decryptVault(await legacyEnvelope(state), 'test-only password');
    expect(opened).toEqual(state);
  });

  it('accepts the exact v2 envelope metadata and rejects malformed parameters', () => {
    const valid = {
      format: 'recomp-encrypted-vault', version: 2, kdf: 'PBKDF2-SHA256',
      iterations: 600000, cipher: 'AES-256-GCM',
      salt: toBase64(new Uint8Array(16)), iv: toBase64(new Uint8Array(12)),
      ciphertext: toBase64(new Uint8Array(32)),
    };
    expect(parseEnvelope(valid)).toEqual(valid);
    expect(() => parseEnvelope({ ...valid, iterations: 1 })).toThrow();
    expect(() => parseEnvelope({ ...valid, iv: toBase64(new Uint8Array(8)) })).toThrow();
  });
  it('writes a modified vault using the same encrypted v2 envelope without mutating input', async () => {
    const original = {
      schema: 2, profile: {}, settings: {}, measurements: [], workouts: {}, nutrition: {},
      plan_library: { schema_version: 1, versions: [], active_entry_id: null },
    };
    const session = await unlockEncryptedVault(await legacyEnvelope(original), 'test-only password');
    const candidate = { ...session.state, plan_library: {
      schema_version: 1, versions: [{ entry_id: 'local-1', imported_at: '2026-11-05T00:00:00.000Z', plan: { plan_id: 'new' } }],
      active_entry_id: 'local-1',
    } };
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
    } as Storage;
    await persistEncryptedVault(candidate, session.key, session.salt, storage);
    const persisted = data.values().next().value;
    expect(parseEnvelope(persisted).format).toBe('recomp-encrypted-vault');
    expect(await decryptVault(parseEnvelope(persisted), 'test-only password')).toEqual(candidate);
    expect(session.state).toEqual(original);
  });

  it('keeps stored bytes unchanged if encrypted persistence fails', async () => {
    const original = { schema: 2, profile: {}, settings: {}, measurements: [], workouts: {}, nutrition: {} };
    const session = await unlockEncryptedVault(await legacyEnvelope(original), 'test-only password');
    let saved = 'old-envelope';
    const storage = {
      getItem: () => saved,
      setItem: () => { throw new Error('quota'); },
    } as unknown as Storage;
    await expect(persistEncryptedVault({ ...session.state }, session.key, session.salt, storage)).rejects.toThrow('quota');
    expect(saved).toBe('old-envelope');
  });

  it('restores an encrypted backup only after explicit confirmation', async () => {
    const original = { schema: 2, profile: {}, settings: {}, measurements: [], workouts: {}, nutrition: {}, legacyHistory: [] };
    const raw = JSON.stringify(await legacyEnvelope(original));
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } } as Storage;
    const declined = await restoreEncryptedBackup(raw, 'test-only password', storage, () => false);
    expect(declined).toBeNull();
    expect(data.size).toBe(0);
    const restored = await restoreEncryptedBackup(raw, 'test-only password', storage, () => true);
    expect(restored?.state).toEqual(original);
    expect(encryptedBackupJson(storage)).toBe(JSON.stringify(JSON.parse(raw), null, 2));
  });

  it('leaves existing backup bytes unchanged for a wrong password', async () => {
    const raw = JSON.stringify(await legacyEnvelope({ schema: 2, profile: {}, settings: {}, measurements: [], workouts: {}, nutrition: {} }));
    let saved = 'existing';
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } } as unknown as Storage;
    await expect(restoreEncryptedBackup(raw, 'wrong password', storage, () => true)).rejects.toThrow();
    expect(saved).toBe('existing');
  });

});
