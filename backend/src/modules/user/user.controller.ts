/**
 * User controller - handles HTTP requests
 * FLOW U1: Base Profile endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../../domain/user/UserService.js';
import {
  NicknameAlreadyTakenError,
  PhoneAlreadyTakenError,
  UserNotFoundError,
  InvalidPasswordError,
  SessionNotFoundError,
  ForbiddenError,
} from '../../domain/user/UserService.js';
import { hashToken } from '../../utils/crypto.js';
import { getSessionToken } from '../../infrastructure/auth/CookieAuthAdapter.js';
import { logger } from '../../shared/logger.js';

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * GET /api/user/profile
   * Get current user profile
   */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const profile = await this.userService.getProfile(userId);
      return reply.send({ user: profile });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }

      logger.error('Get profile error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * PATCH /api/user/profile
   * Update user profile
   */
  async updateProfile(
    request: FastifyRequest<{
      Body: {
        firstName?: string;
        lastName?: string;
        nickname?: string;
        phone?: string;
        country?: string;
        dateOfBirth?: string; // ISO date string
        avatarUrl?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const body = request.body;

      // 🔥 FLOW U1.1: Convert dateOfBirth string to Date if provided
      // Валидация формата уже выполнена Fastify schema (format: 'date')
      const updateData: {
        firstName?: string | null;
        lastName?: string | null;
        nickname?: string | null;
        phone?: string | null;
        country?: string | null;
        dateOfBirth?: Date | null;
        avatarUrl?: string | null;
      } = {};

      if (body.firstName !== undefined) updateData.firstName = body.firstName || null;
      if (body.lastName !== undefined) updateData.lastName = body.lastName || null;
      if (body.nickname !== undefined) updateData.nickname = body.nickname || null;
      if (body.phone !== undefined) updateData.phone = body.phone || null;
      if (body.country !== undefined) updateData.country = body.country || null;
      if (body.dateOfBirth !== undefined) {
        // Парсим ISO date string (YYYY-MM-DD) в Date объект
        // null передается как null (не undefined)
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
      }
      if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl || null;

      const profile = await this.userService.updateProfile(userId, updateData);
      return reply.send({ user: profile });
    } catch (error) {
      if (error instanceof NicknameAlreadyTakenError) {
        return reply.status(409).send({
          error: 'Nickname already taken',
          message: error.message,
        });
      }

      if (error instanceof PhoneAlreadyTakenError) {
        return reply.status(409).send({
          error: 'Phone already taken',
          message: error.message,
        });
      }

      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }

      // 🔥 FLOW U1.1: Обработка ошибок валидации dateOfBirth
      if (error instanceof Error && (
        error.message.includes('at least 18 years old') ||
        error.message.includes('cannot be in the future')
      )) {
        return reply.status(400).send({
          error: 'Invalid date of birth',
          message: error.message,
        });
      }

      logger.error('Update profile error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW U1.9: DELETE /api/user/profile
   * Delete user profile (hard delete with password confirmation)
   */
  async deleteProfile(
    request: FastifyRequest<{
      Body: {
        password: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const { password } = request.body;

      await this.userService.deleteProfile(userId, password);

      // Clear session cookie
      reply.clearCookie('session');

      return reply.send({
        message: 'User profile deleted successfully',
      });
    } catch (error) {
      if (error instanceof InvalidPasswordError) {
        return reply.status(401).send({
          error: 'Invalid password',
          message: error.message,
        });
      }

      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }

      logger.error('Delete profile error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW U2: POST /api/user/change-password
   * Change user password
   */
  async changePassword(
    request: FastifyRequest<{
      Body: {
        currentPassword: string;
        newPassword: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const { currentPassword, newPassword } = request.body;

      await this.userService.changePassword({
        userId,
        currentPassword,
        newPassword,
      });

      return reply.send({
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof InvalidPasswordError) {
        return reply.status(400).send({
          error: 'Invalid password',
          message: error.message,
        });
      }

      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }

      // Обработка ошибки "New password must be different"
      if (error instanceof Error && error.message.includes('must be different')) {
        return reply.status(400).send({
          error: 'Invalid new password',
          message: error.message,
        });
      }

      logger.error('Change password error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW S1: GET /api/user/sessions
   * Get all active sessions for the current user
   */
  async getSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const sessions = await this.userService.getUserSessions(userId);
      return reply.send({ sessions });
    } catch (error) {
      logger.error('Get sessions error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW S1: DELETE /api/user/sessions/:sessionId
   * Revoke a specific session
   */
  async revokeSession(
    request: FastifyRequest<{
      Params: {
        sessionId: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const { sessionId } = request.params;

      await this.userService.revokeSession(userId, sessionId);

      return reply.send({
        message: 'Session revoked successfully',
      });
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        return reply.status(404).send({
          error: 'Session not found',
          message: error.message,
        });
      }

      if (error instanceof ForbiddenError) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: error.message,
        });
      }

      logger.error('Revoke session error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW S2: DELETE /api/user/sessions/others
   * Revoke all sessions except the current one
   */
  async revokeOtherSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      // Get current session token
      const sessionToken = getSessionToken(request);
      if (!sessionToken) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const currentTokenHash = hashToken(sessionToken);

      await this.userService.revokeOtherSessions(userId, currentTokenHash);

      return reply.send({
        message: 'All other sessions revoked successfully',
      });
    } catch (error) {
      logger.error('Revoke other sessions error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW S3: POST /api/user/2fa/enable
   * Enable 2FA (step 1 - generate QR code)
   */
  async enable2FA(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      // Get user email from profile
      const profile = await this.userService.getProfile(userId);
      const result = await this.userService.enable2FA(userId, profile.email);

      return reply.send({
        qrCode: result.qrCode,
        backupCodes: result.backupCodes,
      });
    } catch (error) {
      logger.error('Enable 2FA error:', error);
      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW S3: POST /api/user/2fa/verify
   * Verify 2FA (step 2 - confirm with TOTP code)
   */
  async verify2FA(
    request: FastifyRequest<{
      Body: {
        code: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const { code } = request.body;

      if (!code || code.length !== 6) {
        return reply.status(400).send({
          error: 'Invalid code',
          message: 'Code must be 6 digits',
        });
      }

      await this.userService.verify2FA(userId, code);

      return reply.send({
        success: true,
        message: '2FA enabled successfully',
      });
    } catch (error: any) {
      logger.error('Verify 2FA error:', error);
      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }
      if (error.message?.includes('Invalid') || error.message?.includes('not initialized')) {
        return reply.status(400).send({
          error: 'Invalid code',
          message: error.message,
        });
      }
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW S3: POST /api/user/2fa/disable
   * Disable 2FA
   */
  async disable2FA(
    request: FastifyRequest<{
      Body: {
        password: string;
        code: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const { password, code } = request.body;

      if (!password || !code) {
        return reply.status(400).send({
          error: 'Missing required fields',
          message: 'Password and code are required',
        });
      }

      await this.userService.disable2FA(userId, password, code);

      return reply.send({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error: any) {
      logger.error('Disable 2FA error:', error);
      if (error instanceof InvalidPasswordError) {
        return reply.status(401).send({
          error: 'Invalid password',
          message: error.message,
        });
      }
      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          error: 'User not found',
          message: error.message,
        });
      }
      if (error.message?.includes('Invalid') || error.message?.includes('not enabled')) {
        return reply.status(400).send({
          error: 'Invalid request',
          message: error.message,
        });
      }
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }
}
