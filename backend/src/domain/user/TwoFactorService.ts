/**
 * Two-Factor Authentication Service
 * 🔥 FLOW S3: TOTP-based 2FA implementation
 */

import { generateSecret as otplibGenerateSecret, generateURI, verify as otplibVerify } from 'otplib';
import QRCode from 'qrcode';
import { createHash, randomBytes } from 'crypto';
import { logger } from '../../shared/logger.js';

export class TwoFactorService {
  /**
   * Generate a new TOTP secret
   */
  generateSecret(): string {
    return otplibGenerateSecret();
  }

  /**
   * Generate QR code data URL for the secret
   */
  async generateQRCode(email: string, secret: string, issuer: string = 'Comfortrade'): Promise<string> {
    const otpauthUrl = generateURI({
      secret,
      label: email,
      issuer,
    });
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1,
      });
      
      return qrCodeDataUrl;
    } catch (error) {
      logger.error('Failed to generate QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP token
   */
  async verifyToken(secret: string, token: string): Promise<boolean> {
    try {
      const result = await otplibVerify({ secret, token });
      return typeof result === 'boolean' ? result : (result as { valid?: boolean }).valid ?? false;
    } catch (error) {
      logger.error('Failed to verify TOTP token:', error);
      return false;
    }
  }

  /**
   * Generate backup codes (8 codes by default)
   */
  generateBackupCodes(count: number = 8): string[] {
    return Array.from({ length: count }, () =>
      randomBytes(4).toString('hex').toUpperCase()
    );
  }

  /**
   * Hash backup code for storage
   * ❌ ВАЖНО: Не хранить backup codes в plain-text
   */
  hashBackupCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify backup code against hashed codes
   */
  verifyBackupCode(code: string, hashedCodes: string[]): boolean {
    const hashedCode = this.hashBackupCode(code);
    return hashedCodes.includes(hashedCode);
  }

  /**
   * Remove used backup code from array
   */
  removeBackupCode(code: string, hashedCodes: string[]): string[] {
    const hashedCode = this.hashBackupCode(code);
    return hashedCodes.filter((h) => h !== hashedCode);
  }
}
