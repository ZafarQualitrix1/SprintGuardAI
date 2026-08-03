import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICredentialVault } from '../../application/ports/credential-vault.port';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// AES-256-GCM envelope encryption (Solution Architecture §18 Credential Vault), same scheme as
// the Integration Hub's and AI module's vaults.
@Injectable()
export class AesCredentialVaultService implements ICredentialVault {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('credentialVault.encryptionKey')!;
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(cipherText: string): string {
    const [ivB64, authTagB64, dataB64] = cipherText.split(':');
    if (!ivB64 || !authTagB64 || !dataB64) {
      throw new Error('Malformed credential ciphertext');
    }

    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
