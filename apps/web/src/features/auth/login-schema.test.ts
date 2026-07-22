import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '@sprintguard/shared';

describe('loginSchema', () => {
  it('accepts a valid email and an 8+ character password', () => {
    const result = loginSchema.safeParse({ email: 'jane@acme.com', password: 'password123' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({ email: 'jane@acme.com', password: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts a fully valid registration payload', () => {
    const result = registerSchema.safeParse({
      organizationName: 'Acme Corp',
      fullName: 'Jane Doe',
      email: 'jane@acme.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a single-character organization name', () => {
    const result = registerSchema.safeParse({
      organizationName: 'A',
      fullName: 'Jane Doe',
      email: 'jane@acme.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });
});
