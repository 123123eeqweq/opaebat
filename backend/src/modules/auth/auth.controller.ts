/**
 * Auth controller - handles HTTP requests
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../domain/auth/AuthService.js';
import type { AuthResult, AuthResult2FA } from '../../domain/auth/AuthTypes.js';
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
      
      // 🔥 FLOW S1: Extract userAgent and IP address
      const userAgent = request.headers['user-agent'] || null;
      const ipAddress = request.ip || request.socket.remoteAddress || null;

      const result = await this.authService.register(
        { email, password },
        userAgent,
        ipAddress,
      );

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
      
      // 🔥 FLOW S1: Extract userAgent and IP address
      const userAgent = request.headers['user-agent'] || null;
      const ipAddress = request.ip || request.socket.remoteAddress || null;

      const result = await this.authService.login(
        { email, password },
        userAgent,
        ipAddress,
      );

      // 🔥 FLOW S3: Check if 2FA is required
      if ('requires2FA' in result && result.requires2FA) {
        // Don't set cookie, return tempToken for second step
        return reply.send({
          requires2FA: true,
          tempToken: result.tempToken,
        });
      }

      // Normal login - result is AuthResult here (2FA branch returned above)
      const authResult = result as AuthResult;
      setSessionCookie(reply, authResult.sessionToken);

      return reply.send({
        user: authResult.user,
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

  /**
   * 🔥 FLOW S3: POST /api/auth/2fa
   * Verify 2FA code and complete login
   */
  async verifyLogin2FA(
    request: FastifyRequest<{
      Body: {
        tempToken: string;
        code: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { tempToken, code } = request.body;

      if (!tempToken || !code) {
        return reply.status(400).send({
          error: 'Missing required fields',
          message: 'tempToken and code are required',
        });
      }

      // 🔥 FLOW S1: Extract userAgent and IP address
      const userAgent = request.headers['user-agent'] || null;
      const ipAddress = request.ip || request.socket.remoteAddress || null;

      const result = await this.authService.verifyLogin2FA(
        tempToken,
        code,
        userAgent,
        ipAddress,
      );

      // Set cookie
      setSessionCookie(reply, result.sessionToken);

      return reply.send({
        user: result.user,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError || error instanceof InvalidSessionError) {
        return reply.status(401).send({
          error: 'Invalid code or token',
          message: error.message,
        });
      }

      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }

      logger.error('Verify login 2FA error:', error);
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
