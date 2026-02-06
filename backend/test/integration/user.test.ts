/**
 * Integration tests: User profile
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { bootstrapAll } from '../../src/bootstrap/index.js';
import type { FastifyInstance } from 'fastify';
import { registerAndGetCookie, cookieHeader } from './helpers.js';

describe('User Profile Integration', () => {
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
        console.warn('⚠️  Skipping user integration tests - database not available');
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /api/user/profile', () => {
    it.skipIf(!app)('should return profile for authenticated user', async () => {
      const cookie = await registerAndGetCookie(app!);

      const res = await app!.inject({
        method: 'GET',
        url: '/api/user/profile',
        headers: cookieHeader(cookie!),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('id');
    });

    it.skipIf(!app)('should reject without auth', async () => {
      const res = await app!.inject({ method: 'GET', url: '/api/user/profile' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/user/profile', () => {
    it.skipIf(!app)('should update profile', async () => {
      const cookie = await registerAndGetCookie(app!);

      const res = await app!.inject({
        method: 'PATCH',
        url: '/api/user/profile',
        headers: cookieHeader(cookie!),
        payload: {
          firstName: 'Test',
          lastName: 'User',
          nickname: 'testuser',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.firstName).toBe('Test');
      expect(body.lastName).toBe('User');
      expect(body.nickname).toBe('testuser');
    });
  });
});
