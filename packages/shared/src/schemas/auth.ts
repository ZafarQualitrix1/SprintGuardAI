import { z } from 'zod';

// Shared between apps/web's React Hook Form validation and (as the source of truth for shape)
// apps/api's class-validator DTOs (modules/iam/presentation/dto) -- kept in sync by hand for now
// since the backend validates via class-validator, not this schema directly; a future step can
// switch the backend to nestjs-zod to enforce this schema at the API boundary too.
export const registerSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName: string;
  roleKey: string;
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
