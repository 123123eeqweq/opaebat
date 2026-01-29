/**
 * Session repository port (interface)
 */

import type { Session } from '../../domain/auth/AuthTypes.js';

export interface SessionRepository {
  create(session: Omit<Session, 'id' | 'createdAt'>): Promise<Session>;
  findByToken(tokenHash: string): Promise<Session | null>;
  deleteByToken(tokenHash: string): Promise<void>;
}
