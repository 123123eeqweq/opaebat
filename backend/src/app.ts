/**
 * Fastify application instance
 */

import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCsrfProtection from '@fastify/csrf-protection';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { logger } from './shared/logger.js';
import { env } from './config/env.js';
import { registerGlobalRateLimit } from './middleware/rateLimit.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerHealthRoutes } from './modules/health/health.routes.js';
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
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    },
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      const id = req.headers['x-request-id'] as string;
      return id || randomUUID();
    },
    disableRequestLogging: false,
  });

  // Request ID + correlation (use client header or generate UUID)
  app.addHook('onRequest', requestIdMiddleware);

  // Global error handler
  app.setErrorHandler(errorHandler);

  // Register CORS plugin
  await app.register(fastifyCors, {
    origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'csrf-token'],
    exposedHeaders: ['Content-Type', 'X-Request-ID'],
  });

  // Register cookie plugin
  await app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET,
  });

  // CSRF protection (cookie-based, token in csrf-token header)
  await app.register(fastifyCsrfProtection, {
    cookieOpts: {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      signed: true,
    },
    getToken: (req) => (req.headers['csrf-token'] as string) || undefined,
  });

  // CSRF hook for mutating methods (POST, PUT, PATCH, DELETE)
  const CSRF_SKIP_PATHS = ['/api/auth/register', '/api/auth/login', '/api/auth/2fa'];
  app.addHook('onRequest', async (request, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    if (request.url === '/health') return;
    if (CSRF_SKIP_PATHS.some((p) => request.url?.startsWith(p))) return;
    return new Promise<void>((resolve, reject) => {
      app.csrfProtection(request, reply, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  // OpenAPI/Swagger docs (must be registered before routes)
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Binary Options API',
        description: 'API for binary options trading platform',
        version: '1.0.0',
      },
      servers: [
        { url: `http://localhost:${env.PORT}`, description: 'Development server' },
      ],
      tags: [
        { name: 'auth', description: 'Authentication' },
        { name: 'accounts', description: 'Trading accounts' },
        { name: 'trades', description: 'Trades' },
        { name: 'user', description: 'User profile' },
        { name: 'wallet', description: 'Wallet & balance' },
        { name: 'instruments', description: 'Instruments & payouts' },
        { name: 'terminal', description: 'Terminal snapshot' },
        { name: 'linechart', description: 'Line chart data' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Security headers (XSS, clickjacking, MIME sniffing protection)
  await app.register(fastifyHelmet, (instance) => {
    const csp = instance.swaggerCSP ?? { script: [], style: [] };
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'].concat(csp.style),
          scriptSrc: ["'self'"].concat(csp.script),
          imgSrc: ["'self'", 'data:', 'https:', 'validator.swagger.io'],
          formAction: ["'self'"],
        },
      },
    };
  });

  // Rate limiting (global + stricter limits on auth routes)
  await registerGlobalRateLimit(app);

  // Health check (comprehensive)
  await registerHealthRoutes(app);

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
