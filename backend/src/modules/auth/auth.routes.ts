/**
 * Auth routes
 */

import type { FastifyInstance } from 'fastify';
import { AuthService } from '../../domain/auth/AuthService.js';
import { PrismaUserRepository } from '../../infrastructure/prisma/PrismaUserRepository.js';
import { PrismaSessionRepository } from '../../infrastructure/prisma/PrismaSessionRepository.js';
import { AuthController } from './auth.controller.js';
import { registerSchema, loginSchema, logoutSchema, meSchema } from './auth.schema.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  // Initialize dependencies
  const userRepository = new PrismaUserRepository();
  const sessionRepository = new PrismaSessionRepository();
  const authService = new AuthService(userRepository, sessionRepository);
  const authController = new AuthController(authService);

  // Register routes
  app.post('/api/auth/register', {
    schema: registerSchema,
  }, (request, reply) => authController.register(request, reply));

  app.post('/api/auth/login', {
    schema: loginSchema,
  }, (request, reply) => authController.login(request, reply));

  app.post('/api/auth/logout', {
    schema: logoutSchema,
  }, (request, reply) => authController.logout(request, reply));

  app.get('/api/auth/me', {
    schema: meSchema,
  }, (request, reply) => authController.me(request, reply));

  // 🔥 FLOW S3: POST /api/auth/2fa
  app.post('/api/auth/2fa', (request, reply) => authController.verifyLogin2FA(request, reply));
}
