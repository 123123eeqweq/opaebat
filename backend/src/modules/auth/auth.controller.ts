/**
 * Auth controller - handles HTTP requests
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../domain/auth/AuthService.js';
import {
  UserNotFoundError,
  InvalidCredentialsError,
  UserAlreadyExistsError,
  SessionNotFoundError,
  InvalidSessionError,
} from '../../domain/auth/AuthErrors.js';
import { setSessionCookie, getSessionToken, clearSessionCookie } from '../../infrastructure/auth/CookieAuthAdapter.js';
import { logger } from '../../shared/logger.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body;

      const result = await this.authService.register({ email, password });

      // Set cookie
      setSessionCookie(reply, result.sessionToken);

      return reply.status(201).send({
        user: result.user,
      });
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        return reply.status(409).send({
          error: 'User already exists',
          message: error.message,
        });
      }

      logger.error('Register error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async login(request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body;

      const result = await this.authService.login({ email, password });

      // Set cookie
      setSessionCookie(reply, result.sessionToken);

      return reply.send({
        user: result.user,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return reply.status(401).send({
          error: 'Invalid credentials',
          message: error.message,
        });
      }

      logger.error('Login error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = getSessionToken(request);
      if (!token) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      await this.authService.logout(token);

      // Clear cookie
      clearSessionCookie(reply);

      return reply.send({
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = getSessionToken(request);
      if (!token) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const user = await this.authService.getMe(token);

      return reply.send({
        user,
      });
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof InvalidSessionError) {
        clearSessionCookie(reply);
        return reply.status(401).send({
          error: 'Invalid or expired session',
          message: error.message,
        });
      }

      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }

      logger.error('Get me error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }
}
