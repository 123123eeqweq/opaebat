/**
 * Auth validation schemas using Zod
 * Provides type-safe validation and input sanitization for auth endpoints
 */

import { z } from 'zod';
import { emailSchema, passwordStrongSchema, passwordSchema } from '../../shared/validation/schemas.js';

/**
 * Schema for user registration
 * Email: RFC-compliant format, Password: min 8 chars, uppercase, lowercase, number
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordStrongSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for 2FA verification during login
 */
export const verify2FASchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required').trim(),
  code: z.string().length(6, '2FA code must be 6 digits').regex(/^\d{6}$/, '2FA code must contain only digits'),
});

export type Verify2FAInput = z.infer<typeof verify2FASchema>;
