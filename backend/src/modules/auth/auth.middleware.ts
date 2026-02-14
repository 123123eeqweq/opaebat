/**
 * Auth middleware - extracts user from session
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../domain/auth/AuthService.js';
import { PrismaUserRepository } from '../../infrastructure/prisma/PrismaUserRepository.js';
import { PrismaSessionRepository } from '../../infrastructure/prisma/PrismaSessionRepository.js';
import { getSessionToken } from '../../infrastructure/auth/CookieAuthAdapter.js';
import { SessionNotFoundError, InvalidSessionError } from '../../domain/auth/AuthErrors.js';

// Extend FastifyRequest to include userId
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

let authServiceInstance: AuthService | null = null;

function getAuthService(): AuthService {
  if (!authServiceInstance) {
    const userRepository = new PrismaUserRepository();
    const sessionRepository = new PrismaSessionRepository();
    authServiceInstance = new AuthService(userRepository, sessionRepository);
  }
  return authServiceInstance;
}

/**
 * Auth middleware - requires authentication
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = getSessionToken(request);
  if (!token) {
    reply.status(401).send({
      error: 'Not authenticated',
    });
    return;
  }

  try {
    const authService = getAuthService();
    const user = await authService.getMe(token);
    request.userId = user.id;
  } catch (error) {
    if (error instanceof SessionNotFoundError || error instanceof InvalidSessionError) {
      reply.status(401).send({
        error: 'Invalid or expired session',
      });
      return;
    }
    reply.status(500).send({
      error: 'Internal server error',
    });
    return;
  }
}

/**
 * Admin middleware - requires authentication + admin role.
 * Must be used after requireAuth. Admin = email in ADMIN_EMAILS env (comma-separated).
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = request.userId;
  if (!userId) {
    reply.status(401).send({ error: 'Not authenticated' });
    return;
  }

  const adminEmailsRaw = process.env.ADMIN_EMAILS ?? '';
  const adminEmails = adminEmailsRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    request.log.warn('ADMIN_EMAILS not configured - no admins allowed');
    reply.status(403).send({ error: 'Forbidden' });
    return;
  }

  try {
    const userRepository = new PrismaUserRepository();
    const user = await userRepository.findById(userId);
    if (!user || !adminEmails.includes(user.email.toLowerCase())) {
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }
  } catch (error) {
    request.log.error({ err: error }, 'requireAdmin error');
    reply.status(500).send({ error: 'Internal server error' });
    return;
  }
}
