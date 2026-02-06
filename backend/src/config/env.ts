/**
 * Environment configuration and validation
 * All critical variables are validated at startup - app fails fast if misconfigured.
 */

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  /** Cookie signing secret - required in production */
  COOKIE_SECRET: string;
  /** Frontend origin for CORS - required in production */
  FRONTEND_URL: string;
  /** API key for Real market prices (xchangeapi.com) - required in production */
  XCHANGE_API_KEY: string;
  /** Max file upload size in bytes (avatars) - default 5MB */
  MAX_UPLOAD_SIZE: number;
  /** Database connection pool size - appended to DATABASE_URL if set */
  DATABASE_POOL_SIZE: number;
  /** Database pool timeout (seconds) - wait for connection from pool */
  DATABASE_POOL_TIMEOUT: number;
  /** Database connect timeout (seconds) - establish new connection */
  DATABASE_CONNECT_TIMEOUT: number;
  /** Redis URL for Bull queues - when set, use Bull; otherwise fallback to setInterval */
  REDIS_URL: string | null;
}

const DEFAULT_MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_DATABASE_POOL_SIZE = 10;
const DEFAULT_DATABASE_POOL_TIMEOUT = 20; // seconds
const DEFAULT_DATABASE_CONNECT_TIMEOUT = 10; // seconds
const DEV_COOKIE_SECRET = 'dev-secret-not-for-production';
const DEV_FRONTEND_URL = 'http://localhost:3000';

function validateEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Base required vars (all environments)
  const baseRequired = ['PORT', 'DATABASE_URL', 'NODE_ENV'] as const;
  const missing: string[] = [];

  for (const varName of baseRequired) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Production-only required vars
  if (isProduction) {
    if (!process.env.COOKIE_SECRET?.trim()) {
      missing.push('COOKIE_SECRET');
    }
    if (!process.env.FRONTEND_URL?.trim()) {
      missing.push('FRONTEND_URL');
    }
    if (!process.env.XCHANGE_API_KEY?.trim()) {
      missing.push('XCHANGE_API_KEY');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file. In production, COOKIE_SECRET, FRONTEND_URL, and XCHANGE_API_KEY are required.'
    );
  }

  const port = parseInt(process.env.PORT!, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  }

  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV value: ${nodeEnv}. Must be one of: development, production, test.`);
  }

  // MAX_UPLOAD_SIZE - optional, default 5MB
  let maxUploadSize = DEFAULT_MAX_UPLOAD_SIZE;
  if (process.env.MAX_UPLOAD_SIZE) {
    const parsed = parseInt(process.env.MAX_UPLOAD_SIZE, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 50 * 1024 * 1024) {
      maxUploadSize = parsed;
    }
  }

  // DATABASE_POOL_SIZE - optional, default 10
  let databasePoolSize = DEFAULT_DATABASE_POOL_SIZE;
  if (process.env.DATABASE_POOL_SIZE) {
    const parsed = parseInt(process.env.DATABASE_POOL_SIZE, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      databasePoolSize = parsed;
    }
  }

  // DATABASE_POOL_TIMEOUT - optional, default 20 seconds
  let databasePoolTimeout = DEFAULT_DATABASE_POOL_TIMEOUT;
  if (process.env.DATABASE_POOL_TIMEOUT) {
    const parsed = parseInt(process.env.DATABASE_POOL_TIMEOUT, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 120) {
      databasePoolTimeout = parsed;
    }
  }

  // DATABASE_CONNECT_TIMEOUT - optional, default 10 seconds
  let databaseConnectTimeout = DEFAULT_DATABASE_CONNECT_TIMEOUT;
  if (process.env.DATABASE_CONNECT_TIMEOUT) {
    const parsed = parseInt(process.env.DATABASE_CONNECT_TIMEOUT, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 60) {
      databaseConnectTimeout = parsed;
    }
  }

  // Append connection pool params to DATABASE_URL if not already present
  let databaseUrl = process.env.DATABASE_URL!;
  const urlParams: string[] = [];
  if (!databaseUrl.includes('connection_limit')) {
    urlParams.push(`connection_limit=${databasePoolSize}`);
  }
  if (!databaseUrl.includes('pool_timeout')) {
    urlParams.push(`pool_timeout=${databasePoolTimeout}`);
  }
  if (!databaseUrl.includes('connect_timeout')) {
    urlParams.push(`connect_timeout=${databaseConnectTimeout}`);
  }
  if (urlParams.length > 0) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}${urlParams.join('&')}`;
    process.env.DATABASE_URL = databaseUrl;
  }

  // REDIS_URL - optional, for Bull job queues (redis://localhost:6379 or Upstash Redis URL)
  const redisUrl = process.env.REDIS_URL?.trim() || null;

  return {
    PORT: port,
    DATABASE_URL: databaseUrl,
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
    COOKIE_SECRET: isProduction
      ? process.env.COOKIE_SECRET!.trim()
      : (process.env.COOKIE_SECRET?.trim() || DEV_COOKIE_SECRET),
    FRONTEND_URL: isProduction
      ? process.env.FRONTEND_URL!.trim()
      : (process.env.FRONTEND_URL?.trim() || DEV_FRONTEND_URL),
    XCHANGE_API_KEY: isProduction
      ? process.env.XCHANGE_API_KEY!.trim()
      : (process.env.XCHANGE_API_KEY?.trim() || ''),
    MAX_UPLOAD_SIZE: maxUploadSize,
    DATABASE_POOL_SIZE: databasePoolSize,
    DATABASE_POOL_TIMEOUT: databasePoolTimeout,
    DATABASE_CONNECT_TIMEOUT: databaseConnectTimeout,
    REDIS_URL: redisUrl,
  };
}

export const env = validateEnv();
