import { ConfigService } from '@nestjs/config';
import { AesCredentialVaultService } from './aes-credential-vault.service';

function buildVault(secret = 'a-sufficiently-random-test-secret'): AesCredentialVaultService {
  const configService = { get: () => secret } as unknown as ConfigService;
  return new AesCredentialVaultService(configService);
}

describe('AesCredentialVaultService', () => {
  it('round-trips plaintext through encrypt/decrypt', () => {
    const vault = buildVault();
    const plainText = JSON.stringify({ email: 'jane@acme.com', apiToken: 'super-secret-token' });

    const cipherText = vault.encrypt(plainText);

    expect(cipherText).not.toContain('super-secret-token');
    expect(vault.decrypt(cipherText)).toBe(plainText);
  });

  it('produces different ciphertext for the same plaintext on each call (random IV)', () => {
    const vault = buildVault();
    const first = vault.encrypt('same-value');
    const second = vault.encrypt('same-value');

    expect(first).not.toBe(second);
    expect(vault.decrypt(first)).toBe('same-value');
    expect(vault.decrypt(second)).toBe('same-value');
  });

  it('rejects ciphertext tampered with after encryption (GCM auth tag mismatch)', () => {
    const vault = buildVault();
    const cipherText = vault.encrypt('sensitive-value');
    const [iv, authTag, data] = cipherText.split(':');
    const tamperedData = Buffer.from(data, 'base64');
    tamperedData[0] = tamperedData[0] ^ 0xff;
    const tampered = [iv, authTag, tamperedData.toString('base64')].join(':');

    expect(() => vault.decrypt(tampered)).toThrow();
  });

  it('cannot decrypt ciphertext produced with a different key', () => {
    const vaultA = buildVault('secret-a');
    const vaultB = buildVault('secret-b');
    const cipherText = vaultA.encrypt('cross-vault-value');

    expect(() => vaultB.decrypt(cipherText)).toThrow();
  });
});
