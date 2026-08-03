export const CREDENTIAL_VAULT = Symbol('IOrgSettingsCredentialVault');

// AES-256-GCM envelope encryption for Slack/Teams webhook URLs -- same scheme as the Integration
// Hub's and AI module's vaults, duplicated rather than shared across modules to avoid coupling
// this bounded context to another for an unrelated concern.
export interface ICredentialVault {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}
