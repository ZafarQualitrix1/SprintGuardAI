export const CREDENTIAL_VAULT = Symbol('ICredentialVault');

// AES-256-GCM envelope encryption for third-party credentials (Solution Architecture §18/§25).
// Ciphertext format is opaque to callers -- only encrypt/decrypt matter at this boundary.
export interface ICredentialVault {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}
