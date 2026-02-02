/**
 * File storage - handles file uploads
 * FLOW U1: Avatar upload (local storage for MVP)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { logger } from '../../shared/logger.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');

// Ensure directories exist
async function ensureDirectories(): Promise<void> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(AVATARS_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create upload directories:', error);
    throw error;
  }
}

// Initialize directories on module load
ensureDirectories().catch((error) => {
  logger.error('Failed to initialize upload directories:', error);
});

export interface UploadResult {
  filename: string;
  filepath: string;
  url: string;
}

export class FileStorage {
  /**
   * Save avatar file
   */
  async saveAvatar(file: Buffer, originalFilename: string, userId: string): Promise<UploadResult> {
    await ensureDirectories();

    // Generate unique filename
    const ext = path.extname(originalFilename).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.length > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    const randomId = randomBytes(16).toString('hex');
    const filename = `${userId}-${randomId}${ext}`;
    const filepath = path.join(AVATARS_DIR, filename);

    // Save file
    await fs.writeFile(filepath, file);

    // Return public URL (for MVP, relative path)
    const url = `/uploads/avatars/${filename}`;

    return {
      filename,
      filepath,
      url,
    };
  }

  /**
   * Delete avatar file
   */
  async deleteAvatar(url: string): Promise<void> {
    try {
      // Extract filename from URL
      const filename = path.basename(url);
      const filepath = path.join(AVATARS_DIR, filename);

      // Check if file exists
      try {
        await fs.access(filepath);
        await fs.unlink(filepath);
      } catch (error) {
        // File doesn't exist, ignore
        logger.warn(`Avatar file not found: ${filepath}`);
      }
    } catch (error) {
      logger.error('Failed to delete avatar:', error);
      throw error;
    }
  }
}
