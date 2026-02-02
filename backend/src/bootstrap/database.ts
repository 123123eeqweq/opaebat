/**
 * Database bootstrap - Prisma PostgreSQL connection
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../shared/logger.js';

let prismaClient: PrismaClient | null = null;

export async function connectDatabase(): Promise<PrismaClient> {
  if (prismaClient) {
    return prismaClient;
  }

  logger.info('Connecting to PostgreSQL database...');

  prismaClient = new PrismaClient({
    log: ['error'], // Отключаем query логи - только ошибки
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
