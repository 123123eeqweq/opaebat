/**
 * Fastify application instance
 */

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { logger } from './shared/logger.js';
import { env } from './config/env.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerAccountsRoutes } from './modules/accounts/accounts.routes.js';
import { registerTradesRoutes } from './modules/trades/trades.routes.js';
import { registerTerminalRoutes } from './modules/terminal/terminal.routes.js';
import { registerLineChartRoutes } from './modules/linechart/linechart.routes.js';
import { registerUserRoutes } from './modules/user/user.routes.js';
import { registerWalletRoutes } from './modules/wallet/wallet.routes.js';
import { registerInstrumentsRoutes } from './modules/instruments/instruments.routes.js';

export async function createApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    disableRequestLogging: false,
  });

  // Register CORS plugin
  await app.register(fastifyCors, {
    origin: env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'http://localhost:3000'
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
  });

  // Register cookie plugin
  await app.register(fastifyCookie, {
    secret: env.NODE_ENV === 'production' ? process.env.COOKIE_SECRET || 'change-me-in-production' : 'dev-secret',
  });

  // Health check endpoint (basic, no business logic)
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register auth routes
  await registerAuthRoutes(app);

  // Register accounts routes
  await registerAccountsRoutes(app);

  // Register trades routes
  await registerTradesRoutes(app);

  // Register terminal routes
  await registerTerminalRoutes(app);

  // Register line chart routes
  await registerLineChartRoutes(app);

  // Register user routes (FLOW U1: Base Profile)
  await registerUserRoutes(app);

  // Register wallet routes (FLOW W1: Deposit)
  await registerWalletRoutes(app);

  // Register instruments routes (FLOW I-PAYOUT: Instrument payout)
  await registerInstrumentsRoutes(app);

  logger.info('Fastify application instance created');

  return app;
}
