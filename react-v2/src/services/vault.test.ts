import { describe, expect, it } from 'vitest';
import { parseEnvelope, toBase64 } from './vault';

describe('legacy vault envelope compatibility', () => {
  it('accepts the exact v2 PBKDF2/AES-GCM envelope metadata and sizes', () => {
    const env = {
      format: 'recomp-encrypted-vault', version: 2, kdf: 'PBKDF2-SHA256',
      iterations: 600000, cipher: 'AES-256-GCM',
      salt: toBase64(new Uint8Array(16)), iv: toBase64(new Uint8Array(12)),
      ciphertext: toBase64(new Uint8Array(32)),
    };
    expect(parseEnvelope(env)).toEqual(env);
  });
  it('rejects unsupported iterations and malformed IVs', () => {
    expect(() => parseEnvelope({format:'recomp-encrypted-vault',version:2,kdf:'PBKDF2-SHA256',iterations:1,cipher:'AES-256-GCM',salt:'A'.repeat(24),iv:'A'.repeat(16),ciphertext:'A'.repeat(24)})).toThrow();
    expect(() => parseEnvelope({format:'recomp-encrypted-vault',version:2,kdf:'PBKDF2-SHA256',iterations:600000,cipher:'AES-256-GCM',salt:toBase64(new Uint8Array(16)),iv:toBase64(new Uint8Array(8)),ciphertext:toBase64(new Uint8Array(32))})).toThrow();
  });
});
