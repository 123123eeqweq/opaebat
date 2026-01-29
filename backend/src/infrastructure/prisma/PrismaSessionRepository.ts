/**
 * Prisma implementation of SessionRepository
 */

import { getPrismaClient } from '../../bootstrap/database.js';
import type { SessionRepository } from '../../ports/repositories/SessionRepository.js';
import type { Session } from '../../domain/auth/AuthTypes.js';

export class PrismaSessionRepository implements SessionRepository {
  async create(sessionData: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
    const prisma = getPrismaClient();
    const session = await prisma.session.create({
      data: {
        userId: sessionData.userId,
        tokenHash: sessionData.tokenHash,
        expiresAt: sessionData.expiresAt,
      },
    });

    return {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async findByToken(tokenHash: string): Promise<Session | null> {
    const prisma = getPrismaClient();
    const session = await prisma.session.findUnique({
      where: { tokenHash },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async deleteByToken(tokenHash: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  }
}
