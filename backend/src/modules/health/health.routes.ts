/**
 * Comprehensive health check endpoint
 * Checks database, WebSocket, price engines
 */

import type { FastifyInstance } from 'fastify';

interface HealthCheck {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck & { latency?: number };
    websocket: HealthCheck & { connections?: number };
    priceEngines: HealthCheck & { instruments?: number };
  };
}

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (): Promise<HealthResponse> => {
    const timestamp = new Date().toISOString();
    const checks: HealthResponse['checks'] = {
      database: { status: 'down' },
      websocket: { status: 'down' },
      priceEngines: { status: 'down' },
    };

    // Database check
    try {
      const { getPrismaClient } = await import('../../bootstrap/database.js');
      const start = Date.now();
      await getPrismaClient().$queryRaw`SELECT 1`;
      checks.database = { status: 'up', latency: Date.now() - start };
    } catch (err) {
      checks.database = {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    // WebSocket check
    try {
      const { getWebSocketManager } = await import('../websocket/websocket.routes.js');
      const wsManager = getWebSocketManager();
      const connections = wsManager.getClientCount();
      checks.websocket = { status: 'up', connections };
    } catch (err) {
      checks.websocket = {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    // Price engines check
    try {
      const { getPriceEngineManager } = await import('../../bootstrap/prices.bootstrap.js');
      const priceManager = getPriceEngineManager();
      const instruments = priceManager.getInstrumentIds().length;
      checks.priceEngines = { status: 'up', instruments };
    } catch (err) {
      checks.priceEngines = {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    const allUp =
      checks.database.status === 'up' &&
      checks.websocket.status === 'up' &&
      checks.priceEngines.status === 'up';

    return {
      status: allUp ? 'healthy' : 'unhealthy',
      timestamp,
      checks,
    };
  });
}
