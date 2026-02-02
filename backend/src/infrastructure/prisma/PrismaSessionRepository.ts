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
        userAgent: sessionData.userAgent ?? null,
        ipAddress: sessionData.ipAddress ?? null,
      },
    });

    return {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
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
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    };
  }

  async deleteByToken(tokenHash: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  }

  // 🔥 FLOW U1.9: Delete all sessions for a user
  async deleteAllByUserId(userId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  // 🔥 FLOW S1: Get all active sessions for a user
  async findAllByUserId(userId: string): Promise<Session[]> {
    const prisma = getPrismaClient();
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }, // Only active sessions
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    }));
  }

  // 🔥 FLOW S1: Find session by ID
  async findById(sessionId: string): Promise<Session | null> {
    const prisma = getPrismaClient();
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
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
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    };
  }

  // 🔥 FLOW S1: Delete a specific session by ID
  async deleteById(sessionId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.session.delete({
      where: { id: sessionId },
    });
  }

  // 🔥 FLOW S2: Delete all sessions except the current one
  async deleteAllExcept(userId: string, currentTokenHash: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.session.deleteMany({
      where: {
        userId,
        tokenHash: { not: currentTokenHash },
      },
    });
  }
}
