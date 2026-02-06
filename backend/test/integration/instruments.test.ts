/**
 * Integration tests: Instruments
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { bootstrapAll } from '../../src/bootstrap/index.js';
import type { FastifyInstance } from 'fastify';

describe('Instruments Integration', () => {
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
        console.warn('⚠️  Skipping instruments integration tests - database not available');
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /api/instruments', () => {
    it.skipIf(!app)('should return instruments without auth', async () => {
      const res = await app!.inject({
        method: 'GET',
        url: '/api/instruments',
      });

      expect(res.statusCode).toBe(200);
      const instruments = JSON.parse(res.body);
      expect(Array.isArray(instruments)).toBe(true);
      expect(instruments.length).toBeGreaterThan(0);
      const first = instruments[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('base');
      expect(first).toHaveProperty('quote');
      expect(first).toHaveProperty('payoutPercent');
    });
  });
});
