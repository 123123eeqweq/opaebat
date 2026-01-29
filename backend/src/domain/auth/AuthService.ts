/**
 * Auth domain service - pure business logic
 */

import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { SessionRepository } from '../../ports/repositories/SessionRepository.js';
import type { RegisterInput, LoginInput, AuthResult } from './AuthTypes.js';
import {
  UserNotFoundError,
  InvalidCredentialsError,
  UserAlreadyExistsError,
  SessionNotFoundError,
  InvalidSessionError,
} from './AuthErrors.js';
import { hashPassword, verifyPassword, hashToken, generateSessionToken } from '../../utils/crypto.js';

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
  ) {}

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new UserAlreadyExistsError(input.email);
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const user = await this.userRepository.create({
      email: input.email,
      password: passwordHash,
    });

    // Create session
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.sessionRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      sessionToken,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResult> {
    // Find user by email
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    // Create session
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.sessionRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      sessionToken,
    };
  }

  /**
   * Logout user (delete session)
   */
  async logout(sessionToken: string): Promise<void> {
    const tokenHash = hashToken(sessionToken);
    await this.sessionRepository.deleteByToken(tokenHash);
  }

  /**
   * Get current user by session token
   */
  async getMe(sessionToken: string): Promise<Omit<import('./AuthTypes.js').User, 'password'>> {
    const tokenHash = hashToken(sessionToken);

    // Find session
    const session = await this.sessionRepository.findByToken(tokenHash);
    if (!session) {
      throw new SessionNotFoundError();
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      throw new InvalidSessionError();
    }

    // Find user
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
