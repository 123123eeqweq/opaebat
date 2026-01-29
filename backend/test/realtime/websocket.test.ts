/**
 * Realtime tests: WebSocket
 * Tests WebSocket connection and events
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { createApp } from '../../src/app.js';
import { bootstrapAll } from '../../src/bootstrap/index.js';
import type { FastifyInstance } from 'fastify';

describe('WebSocket Realtime', () => {
  let app: FastifyInstance | null = null;
  let serverUrl: string | null = null;

  beforeAll(async () => {
    // Ensure env vars are set
    if (!process.env.PORT) process.env.PORT = '3002';
    if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgresql://postgres:ghfjsadf87asd867fa8sdfu2@localhost:5432/im5_test';
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

    try {
      app = await createApp();
      await bootstrapAll(app);
      await app.ready();
      
      const address = await app.listen({ port: 0, host: '127.0.0.1' });
      serverUrl = address.replace('http://', 'ws://');
    } catch (error: any) {
      // Skip tests if DB not available
      if (error?.code === 'P1003' || error?.message?.includes('does not exist')) {
        console.warn('⚠️  Skipping realtime tests - database not available');
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

  describe('Connection', () => {
    it.skipIf(!app || !serverUrl)('should disconnect without cookie', (done) => {
      const ws = new WebSocket(`${serverUrl}/ws`);

      ws.on('close', (code) => {
        expect(code).not.toBe(1000); // Not normal closure
        done();
      });

      ws.on('error', () => {
        // Expected - connection should fail
      });
    });

    it.skipIf(!app || !serverUrl)('should connect with valid cookie', async () => {
      // First, register to get a cookie
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `test-ws-${Date.now()}@example.com`,
          password: 'password123',
        },
      });

      const sessionCookie = registerResponse.cookies.find((c) => c.name === 'session');
      expect(sessionCookie).toBeDefined();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${serverUrl}/ws`, {
          headers: {
            Cookie: `session=${sessionCookie!.value}`,
          },
        });

        ws.on('open', () => {
          ws.close();
          resolve();
        });

        ws.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);
      });
    });
  });

  describe('Events', () => {
    it.skipIf(!app || !serverUrl)('should receive server:time events', async () => {
      // Register and get cookie
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `test-events-${Date.now()}@example.com`,
          password: 'password123',
        },
      });

      const sessionCookie = registerResponse.cookies.find((c) => c.name === 'session');
      expect(sessionCookie).toBeDefined();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${serverUrl}/ws`, {
          headers: {
            Cookie: `session=${sessionCookie!.value}`,
          },
        });

        let receivedTimeEvent = false;

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'server:time') {
              expect(message.data).toHaveProperty('timestamp');
              expect(typeof message.data.timestamp).toBe('number');
              receivedTimeEvent = true;
              ws.close();
              resolve();
            }
          } catch (error) {
            // Ignore parse errors
          }
        });

        ws.on('open', () => {
          // Wait for server:time event (sent every 1 second)
          setTimeout(() => {
            if (!receivedTimeEvent) {
              reject(new Error('Did not receive server:time event'));
            }
          }, 2000);
        });

        ws.on('error', (error) => {
          reject(error);
        });
      });
    });
  });
});
