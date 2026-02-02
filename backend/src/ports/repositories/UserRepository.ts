/**
 * User repository port (interface)
 */

import type { User } from '../../domain/auth/AuthTypes.js';

export interface UpdateProfileData {
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  country?: string | null;
  dateOfBirth?: Date | null; // 🔥 FLOW U1.1: Date объект, не string
  avatarUrl?: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateProfile(userId: string, data: UpdateProfileData): Promise<User>;
  findByNickname(nickname: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  deleteById(userId: string): Promise<void>; // 🔥 FLOW U1.9: Delete user profile
  updatePassword(userId: string, passwordHash: string): Promise<void>; // 🔥 FLOW U2: Change password
  
  // 🔥 FLOW S3: Two-Factor Authentication
  updateTwoFactorSecret(userId: string, secret: string | null): Promise<void>;
  enableTwoFactor(userId: string, backupCodes: string[]): Promise<void>;
  disableTwoFactor(userId: string): Promise<void>;
  updateBackupCodes(userId: string, backupCodes: string[]): Promise<void>;
}
