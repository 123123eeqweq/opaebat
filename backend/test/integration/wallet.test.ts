/**
 * Integration tests: Wallet flow
 * deposit → balance update
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { bootstrapAll } from '../../src/bootstrap/index.js';
import type { FastifyInstance } from 'fastify';
import { registerAndGetCookie, cookieHeader } from './helpers.js';

describe('Wallet Flow Integration', () => {
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
        console.warn('⚠️  Skipping wallet integration tests - database not available');
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/wallet/deposit', () => {
    it.skipIf(!app)('should deposit and update balance', async () => {
      const cookie = await registerAndGetCookie(app!);
      expect(cookie).toBeDefined();

      // Initial balance (REAL account) should be 0
      const balanceBeforeRes = await app!.inject({
        method: 'GET',
        url: '/api/wallet/balance',
        headers: cookieHeader(cookie!),
      });
      expect(balanceBeforeRes.statusCode).toBe(200);
      const balanceBefore = JSON.parse(balanceBeforeRes.body);
      expect(Number(balanceBefore.balance)).toBe(0);

      // Deposit
      const depositRes = await app!.inject({
        method: 'POST',
        url: '/api/wallet/deposit',
        headers: cookieHeader(cookie!),
        payload: {
          amount: 200,
          paymentMethod: 'CARD',
        },
      });

      expect(depositRes.statusCode).toBe(200);
      const depositBody = JSON.parse(depositRes.body);
      expect(depositBody.transactionId).toBeDefined();
      expect(depositBody.status).toBeDefined();
      expect(depositBody.amount).toBe(200);

      // Balance should reflect deposit
      const balanceAfterRes = await app!.inject({
        method: 'GET',
        url: '/api/wallet/balance',
        headers: cookieHeader(cookie!),
      });
      expect(balanceAfterRes.statusCode).toBe(200);
      const balanceAfter = JSON.parse(balanceAfterRes.body);
      expect(Number(balanceAfter.balance)).toBe(200);
    });

    it.skipIf(!app)('should reject deposit without auth', async () => {
      const res = await app!.inject({
        method: 'POST',
        url: '/api/wallet/deposit',
        payload: { amount: 200, paymentMethod: 'CARD' },
      });
      expect(res.statusCode).toBe(401);
    });

    it.skipIf(!app)('should reject amount below minimum', async () => {
      const cookie = await registerAndGetCookie(app!);
      const res = await app!.inject({
        method: 'POST',
        url: '/api/wallet/deposit',
        headers: cookieHeader(cookie!),
        payload: { amount: 100, paymentMethod: 'CARD' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/wallet/balance', () => {
    it.skipIf(!app)('should return balance for authenticated user', async () => {
      const cookie = await registerAndGetCookie(app!);
      const res = await app!.inject({
        method: 'GET',
        url: '/api/wallet/balance',
        headers: cookieHeader(cookie!),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('currency');
      expect(body).toHaveProperty('balance');
    });
  });
});
