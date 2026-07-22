import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { IPasswordHasher } from '../../application/ports/password-hasher.port';

// Argon2id (Solution Architecture §25) -- the OWASP-recommended variant, resistant to both
// GPU-cracking (memory-hard) and side-channel attacks (unlike Argon2i/Argon2d alone).
@Injectable()
export class Argon2PasswordHasher implements IPasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, { type: argon2.argon2id });
  }

  verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
