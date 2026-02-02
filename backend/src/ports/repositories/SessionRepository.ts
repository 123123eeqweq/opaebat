/**
 * Session repository port (interface)
 */

import type { Session } from '../../domain/auth/AuthTypes.js';

export interface SessionRepository {
  create(session: Omit<Session, 'id' | 'createdAt'>): Promise<Session>;
  findByToken(tokenHash: string): Promise<Session | null>;
  deleteByToken(tokenHash: string): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>; // 🔥 FLOW U1.9: Delete all user sessions
  
  // 🔥 FLOW S1: Get all active sessions for a user
  findAllByUserId(userId: string): Promise<Session[]>;
  
  // 🔥 FLOW S1: Delete a specific session by ID
  deleteById(sessionId: string): Promise<void>;
  
  // 🔥 FLOW S1: Find session by ID (for validation)
  findById(sessionId: string): Promise<Session | null>;
  
  // 🔥 FLOW S2: Delete all sessions except the current one
  deleteAllExcept(userId: string, currentTokenHash: string): Promise<void>;
}
