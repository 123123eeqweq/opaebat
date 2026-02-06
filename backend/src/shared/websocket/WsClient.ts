/**
 * WebSocket client representation
 */

import type { WebSocket } from 'ws';
import type { WsEvent } from './WsEvents.js';
import { logger } from '../logger.js';
import { randomUUID } from 'crypto';

export class WsClient {
  public userId: string | null = null;
  public isAuthenticated = false;
  /**
   * FLOW WS-1: Set подписок на инструменты (может быть несколько)
   */
  public subscriptions = new Set<string>();
  /**
   * FLOW WS-1: Session ID для отслеживания соединения
   */
  public sessionId: string;
  /**
   * Rate limit: message count in current window
   */
  public messageCount = 0;
  /**
   * Rate limit: window start timestamp
   */
  public rateLimitWindowStart = Date.now();

  constructor(private socket: WebSocket) {
    this.sessionId = randomUUID();
  }

  /**
   * Send WebSocket ping for keep-alive (client auto-responds with pong)
   */
  ping(): void {
    try {
      if (this.socket?.readyState === 1) {
        this.socket.ping();
      }
    } catch (error) {
      logger.debug('WsClient ping failed:', error);
    }
  }

  /**
   * Send event to client
   */
  send(event: WsEvent): void {
    try {
      if (!this.socket) {
        logger.warn('Cannot send WS event: socket is not available');
        return;
      }
      this.socket.send(JSON.stringify(event));
    } catch (error) {
      logger.error('Failed to send WS event:', error);
    }
  }

  /**
   * Close connection
   */
  close(): void {
    try {
      if (!this.socket) {
        return;
      }
      this.socket.close();
    } catch (error) {
      logger.error('Failed to close WS connection:', error);
    }
  }

  /**
   * Check if connection is open
   */
  isOpen(): boolean {
    try {
      return this.socket?.readyState === 1; // WebSocket.OPEN
    } catch {
      return false;
    }
  }
}
