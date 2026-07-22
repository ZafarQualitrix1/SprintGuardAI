export const PASSWORD_HASHER = Symbol('IPasswordHasher');

// Port implemented by Infrastructure's Argon2PasswordHasher (Solution Architecture §25:
// "password hashing via Argon2id"). Kept as an interface so the algorithm can change without
// touching any command handler.
export interface IPasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(hash: string, plainPassword: string): Promise<boolean>;
}
