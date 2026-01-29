/**
 * Global test setup
 * IMPORTANT: Set env vars BEFORE any imports that use them
 */

// Set env vars immediately (before any imports)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3002';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:ghfjsadf87asd867fa8sdfu2@localhost:5432/im5_test';

import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Env vars already set above
});

afterAll(async () => {
  // Cleanup if needed
});
