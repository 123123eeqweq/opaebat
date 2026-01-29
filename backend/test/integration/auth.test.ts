/**
 * Integration tests: Auth
 * Tests HTTP endpoints with real Fastify + test DB
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { createApp } from '../../src/app.js';
import { bootstrapAll } from '../../src/bootstrap/index.js';
import type { FastifyInstance } from 'fastify';

describe('Auth Integration', () => {
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    // Ensure env vars are set
    if (!process.env.PORT) process.env.PORT = '3002';
    if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgresql://postgres:ghfjsadf87asd867fa8sdfu2@localhost:5432/im5_test';
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

    try {
      app = await createApp();
      await bootstrapAll(app);
      await app.ready();
    } catch (error: any) {
      // Skip tests if DB not available
      if (error?.code === 'P1003' || error?.message?.includes('does not exist')) {
        console.warn('⚠️  Skipping integration tests - database not available');
        // Mark all tests as skipped
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/auth/register', () => {
    it.skipIf(!app)('should register user and set cookie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `test-${Date.now()}@example.com`,
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(201);
      const cookies = response.cookies;
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.name === 'session')).toBe(true);
    });

    it.skipIf(!app)('should reject duplicate email', async () => {
      const email = `test-${Date.now()}@example.com`;

      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password: 'password123' },
      });

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password: 'password123' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it.skipIf(!app)('should login and set cookie', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';

      // Register first
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password },
      });

      // Login
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email, password },
      });

      expect(response.statusCode).toBe(200);
      const cookies = response.cookies;
      expect(cookies.some((c) => c.name === 'session')).toBe(true);
    });

    it.skipIf(!app)('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it.skipIf(!app)('should return user info with valid cookie', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';

      // Register and get cookie
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password },
      });

      const sessionCookie = registerResponse.cookies.find((c) => c.name === 'session');
      expect(sessionCookie).toBeDefined();

      // Get /me with cookie
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: {
          session: sessionCookie!.value,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const body = JSON.parse(meResponse.body);
      expect(body.user.email).toBe(email);
    });

    it.skipIf(!app)('should reject request without cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
