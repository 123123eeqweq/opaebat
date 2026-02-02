/**
 * User domain service - pure business logic
 * FLOW U1: Base Profile management
 */

import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { UpdateProfileData } from '../../ports/repositories/UserRepository.js';
import type { SessionRepository } from '../../ports/repositories/SessionRepository.js';
import type { User, Session } from '../auth/AuthTypes.js';
import { verifyPassword, hashPassword } from '../../utils/crypto.js';
import { logger } from '../../shared/logger.js';
import { TwoFactorService } from './TwoFactorService.js';

export class NicknameAlreadyTakenError extends Error {
  constructor(nickname: string) {
    super(`Nickname ${nickname} is already taken`);
    this.name = 'NicknameAlreadyTakenError';
  }
}

export class PhoneAlreadyTakenError extends Error {
  constructor(phone: string) {
    super(`Phone ${phone} is already taken`);
    this.name = 'PhoneAlreadyTakenError';
  }
}

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidPasswordError extends Error {
  constructor(message: string = 'Invalid password') {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`);
    this.name = 'SessionNotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UserService {
  private twoFactorService: TwoFactorService;

  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
  ) {
    this.twoFactorService = new TwoFactorService();
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Remove password from response
    const { password, ...profile } = user;
    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<Omit<User, 'password'>> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new UserNotFoundError(userId);
    }

    // Check nickname uniqueness (if provided and different from current)
    if (data.nickname !== undefined && data.nickname !== existingUser.nickname) {
      if (data.nickname !== null && data.nickname !== '') {
        const userWithNickname = await this.userRepository.findByNickname(data.nickname);
        if (userWithNickname && userWithNickname.id !== userId) {
          throw new NicknameAlreadyTakenError(data.nickname);
        }
      }
    }

    // Check phone uniqueness (if provided and different from current)
    if (data.phone !== undefined && data.phone !== existingUser.phone) {
      if (data.phone !== null && data.phone !== '') {
        const userWithPhone = await this.userRepository.findByPhone(data.phone);
        if (userWithPhone && userWithPhone.id !== userId) {
          throw new PhoneAlreadyTakenError(data.phone);
        }
      }
    }

    // 🔥 FLOW U1.1: Validate date of birth (age >= 18)
    if (data.dateOfBirth !== undefined && data.dateOfBirth !== null) {
      const ageInMs = Date.now() - data.dateOfBirth.getTime();
      const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
      
      if (ageInYears < 18) {
        throw new Error('User must be at least 18 years old');
      }
      
      // Проверка на будущую дату
      if (data.dateOfBirth.getTime() > Date.now()) {
        throw new Error('Date of birth cannot be in the future');
      }
    }

    // Update profile
    const updatedUser = await this.userRepository.updateProfile(userId, data);

    // Remove password from response
    const { password, ...profile } = updatedUser;
    return profile;
  }

  /**
   * 🔥 FLOW U1.9: Delete user profile (hard delete)
   * Requires password confirmation
   */
  async deleteProfile(userId: string, password: string): Promise<void> {
    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new InvalidPasswordError();
    }

    // 1. Delete all user sessions
    await this.sessionRepository.deleteAllByUserId(userId);

    // 2. Delete user (cascade will delete accounts, trades, etc.)
    await this.userRepository.deleteById(userId);
  }

  /**
   * 🔥 FLOW U2: Change user password
   * Requires current password verification
   */
  async changePassword({
    userId,
    currentPassword,
    newPassword,
  }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new InvalidPasswordError('Current password is incorrect');
    }

    // Check if new password is different
    if (currentPassword === newPassword) {
      throw new Error('New password must be different from current password');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePassword(userId, newPasswordHash);

    logger.info(`Password changed for user: ${userId}`);

    // 🔥 Опционально: можно инвалидировать все сессии кроме текущей
    // await this.sessionRepository.deleteAllByUserId(userId);
  }

  /**
   * 🔥 FLOW S1: Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.findAllByUserId(userId);
  }

  /**
   * 🔥 FLOW S1: Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.userId !== userId) {
      throw new ForbiddenError('You can only revoke your own sessions');
    }

    await this.sessionRepository.deleteById(sessionId);
    logger.info(`Session ${sessionId} revoked by user ${userId}`);
  }

  /**
   * 🔥 FLOW S2: Revoke all sessions except the current one
   */
  async revokeOtherSessions(userId: string, currentTokenHash: string): Promise<void> {
    await this.sessionRepository.deleteAllExcept(userId, currentTokenHash);
    logger.info(`All other sessions revoked for user ${userId}`);
  }

  /**
   * 🔥 FLOW S3: Enable 2FA (step 1 - generate secret and QR code)
   */
  async enable2FA(userId: string, email: string): Promise<{ qrCode: string; backupCodes: string[] }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Generate secret and QR code
    const secret = this.twoFactorService.generateSecret();
    const qrCode = await this.twoFactorService.generateQRCode(email, secret);

    // Generate backup codes
    const backupCodes = this.twoFactorService.generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map((code) =>
      this.twoFactorService.hashBackupCode(code)
    );

    // Save secret and backup codes, but DON'T enable 2FA yet
    await this.userRepository.updateTwoFactorSecret(userId, secret);
    await this.userRepository.updateBackupCodes(userId, hashedBackupCodes);

    logger.info(`2FA setup initiated for user ${userId}`);

    return {
      qrCode,
      backupCodes, // Return plain codes - show only once!
    };
  }

  /**
   * 🔥 FLOW S3: Verify 2FA (step 2 - confirm with TOTP code)
   */
  async verify2FA(userId: string, token: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!user.twoFactorSecret) {
      throw new Error('2FA not initialized. Please enable 2FA first.');
    }

    // Verify TOTP token
    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    // Enable 2FA
    await this.userRepository.enableTwoFactor(userId, user.twoFactorBackupCodes || []);

    logger.info(`2FA enabled for user ${userId}`);
  }

  /**
   * 🔥 FLOW S3: Disable 2FA
   */
  async disable2FA(userId: string, password: string, token: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new InvalidPasswordError('Invalid password');
    }

    // Verify 2FA token
    if (!user.twoFactorSecret) {
      throw new Error('2FA is not enabled');
    }

    const isValidToken = this.twoFactorService.verifyToken(user.twoFactorSecret, token);
    if (!isValidToken) {
      throw new Error('Invalid 2FA code');
    }

    // Disable 2FA
    await this.userRepository.disableTwoFactor(userId);

    logger.info(`2FA disabled for user ${userId}`);
  }

  /**
   * 🔥 FLOW S3: Check backup code
   */
  checkBackupCode(user: User, code: string): boolean {
    if (!user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
      return false;
    }

    return this.twoFactorService.verifyBackupCode(code, user.twoFactorBackupCodes);
  }

  /**
   * 🔥 FLOW S3: Remove used backup code
   */
  async removeBackupCode(userId: string, code: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.twoFactorBackupCodes) {
      return;
    }

    const updatedCodes = this.twoFactorService.removeBackupCode(code, user.twoFactorBackupCodes);
    await this.userRepository.updateBackupCodes(userId, updatedCodes);
  }
}
