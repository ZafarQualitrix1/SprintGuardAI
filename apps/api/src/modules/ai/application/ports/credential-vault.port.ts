export const CREDENTIAL_VAULT = Symbol('IAiCredentialVault');

// AES-256-GCM envelope encryption for AI provider API keys (Solution Architecture §18/§25) --
// same scheme as the Integration Hub's vault (modules/integration/infrastructure/services/
// aes-credential-vault.service.ts), duplicated rather than shared across modules to avoid coupling
// the AI bounded context to Integration for an unrelated concern. Ciphertext format is opaque to
// callers -- only encrypt/decrypt matter at this boundary.
export interface ICredentialVault {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}
