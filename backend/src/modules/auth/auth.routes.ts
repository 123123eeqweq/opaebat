/**
 * Auth routes
 * Stricter rate limits to prevent brute force and spam.
 */

import type { FastifyInstance } from 'fastify';
import { AuthService } from '../../domain/auth/AuthService.js';
import { AccountService } from '../../domain/accounts/AccountService.js';
import { PrismaUserRepository } from '../../infrastructure/prisma/PrismaUserRepository.js';
import { PrismaSessionRepository } from '../../infrastructure/prisma/PrismaSessionRepository.js';
import { PrismaAccountRepository } from '../../infrastructure/prisma/PrismaAccountRepository.js';
import { PrismaTransactionRepository } from '../../infrastructure/prisma/PrismaTransactionRepository.js';
import { AuthController } from './auth.controller.js';
import { registerSchema, loginSchema, logoutSchema, meSchema } from './auth.schema.js';
import { registerSchema as registerZodSchema, loginSchema as loginZodSchema, verify2FASchema } from './auth.validation.js';
import { validateBody } from '../../shared/validation/validateBody.js';
import {
  RATE_LIMIT_AUTH_LOGIN_MAX,
  RATE_LIMIT_AUTH_LOGIN_WINDOW,
  RATE_LIMIT_AUTH_REGISTER_MAX,
  RATE_LIMIT_AUTH_REGISTER_WINDOW,
  RATE_LIMIT_AUTH_2FA_MAX,
  RATE_LIMIT_AUTH_2FA_WINDOW,
} from '../../config/constants.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  // Initialize dependencies
  const userRepository = new PrismaUserRepository();
  const sessionRepository = new PrismaSessionRepository();
  const accountRepository = new PrismaAccountRepository();
  const transactionRepository = new PrismaTransactionRepository();
  const accountService = new AccountService(accountRepository, transactionRepository);
  const authService = new AuthService(userRepository, sessionRepository, accountService);
  const authController = new AuthController(authService);

  // Register routes with stricter rate limits + Zod validation
  app.post('/api/auth/register', {
    schema: registerSchema,
    preHandler: [validateBody(registerZodSchema)],
    config: {
      rateLimit: {
        max: RATE_LIMIT_AUTH_REGISTER_MAX,
        timeWindow: RATE_LIMIT_AUTH_REGISTER_WINDOW,
      },
    },
  }, (request, reply) => authController.register(request as any, reply));

  app.post('/api/auth/login', {
    schema: loginSchema,
    preHandler: [validateBody(loginZodSchema)],
    config: {
      rateLimit: {
        max: RATE_LIMIT_AUTH_LOGIN_MAX,
        timeWindow: RATE_LIMIT_AUTH_LOGIN_WINDOW,
      },
    },
  }, (request, reply) => authController.login(request as any, reply));

  app.post('/api/auth/logout', {
    schema: logoutSchema,
  }, (request, reply) => authController.logout(request, reply));

  app.get('/api/auth/me', {
    schema: meSchema,
  }, (request, reply) => authController.me(request, reply));

  // 🔥 FLOW S3: POST /api/auth/2fa — 2FA code brute force protection
  app.post('/auth/2fa', {
    preHandler: [validateBody(verify2FASchema)],
    config: {
      rateLimit: {
        max: RATE_LIMIT_AUTH_2FA_MAX,
        timeWindow: RATE_LIMIT_AUTH_2FA_WINDOW,
      },
    },
  }, (request, reply) => authController.verifyLogin2FA(request as any, reply));
}
