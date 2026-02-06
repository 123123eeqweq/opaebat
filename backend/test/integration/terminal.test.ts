/**
 * Integration tests: Terminal snapshot
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { bootstrapAll } from '../../src/bootstrap/index.js';
import type { FastifyInstance } from 'fastify';
import { registerAndGetCookie, cookieHeader } from './helpers.js';

describe('Terminal Integration', () => {
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    if (!process.env.PORT) process.env.PORT = '3002';
    if (!process.env.DATABASE_URL)
      process.env.DATABASE_URL = 'postgresql://postgres:ghfjsadf87asd867fa8sdfu2@localhost:5432/im5_test';
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

    try {
      app = await createApp();
      await bootstrapAll(app);
      await app.ready();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'P1003' || err?.message?.includes('does not exist')) {
        console.warn('⚠️  Skipping terminal integration tests - database not available');
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /api/terminal/snapshot', () => {
    it.skipIf(!app)('should return snapshot for authenticated user', async () => {
      const cookie = await registerAndGetCookie(app!);

      const res = await app!.inject({
        method: 'GET',
        url: '/api/terminal/snapshot',
        headers: cookieHeader(cookie!),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('serverTime');
      expect(body).toHaveProperty('account');
      expect(body).toHaveProperty('instruments');
    });

    it.skipIf(!app)('should reject without auth', async () => {
      const res = await app!.inject({ method: 'GET', url: '/api/terminal/snapshot' });
      expect(res.statusCode).toBe(401);
    });
  });
});
