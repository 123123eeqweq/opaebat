/**
 * Environment configuration and validation
 */

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

const requiredEnvVars = ['PORT', 'DATABASE_URL', 'NODE_ENV'] as const;

function validateEnv(): EnvConfig {
  const missing: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file.'
    );
  }

  const port = parseInt(process.env.PORT!, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  }

  const nodeEnv = process.env.NODE_ENV!;
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV value: ${nodeEnv}. Must be one of: development, production, test.`);
  }

  return {
    PORT: port,
    DATABASE_URL: process.env.DATABASE_URL!,
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
  };
}

export const env = validateEnv();
