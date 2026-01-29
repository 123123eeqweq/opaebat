/**
 * WebSocket authentication adapter
 */

import type { FastifyRequest } from 'fastify';
import { AuthService } from '../../domain/auth/AuthService.js';
import { PrismaUserRepository } from '../prisma/PrismaUserRepository.js';
import { PrismaSessionRepository } from '../prisma/PrismaSessionRepository.js';
import { getSessionToken } from '../auth/CookieAuthAdapter.js';
import { SessionNotFoundError, InvalidSessionError } from '../../domain/auth/AuthErrors.js';
import { logger } from '../../shared/logger.js';

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
 * Authenticate WebSocket connection
 */
export async function authenticateWebSocket(request: FastifyRequest): Promise<string | null> {
  try {
    const token = getSessionToken(request);
    if (!token) {
      logger.warn('WebSocket connection rejected: no session token');
      return null;
    }

    const authService = getAuthService();
    const user = await authService.getMe(token);
    
    return user.id;
  } catch (error) {
    if (error instanceof SessionNotFoundError || error instanceof InvalidSessionError) {
      logger.warn('WebSocket connection rejected: invalid session');
      return null;
    }
    logger.error('WebSocket authentication error:', error);
    return null;
  }
}
