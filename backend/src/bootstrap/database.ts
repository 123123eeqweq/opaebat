/**
 * Database bootstrap - Prisma PostgreSQL connection
 * Connection pool configured via DATABASE_URL params: connection_limit, pool_timeout, connect_timeout
 */

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

let prismaClient: PrismaClient | null = null;

export async function connectDatabase(): Promise<PrismaClient> {
  if (prismaClient) {
    return prismaClient;
  }

  logger.info('Connecting to PostgreSQL database...');

  prismaClient = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

  try {
    await prismaClient.$connect();
    logger.info('✅ PostgreSQL database connected successfully');
    return prismaClient;
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaClient) {
    logger.info('Disconnecting from PostgreSQL database...');
    await prismaClient.$disconnect();
    prismaClient = null;
    logger.info('✅ PostgreSQL database disconnected');
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return prismaClient;
}
