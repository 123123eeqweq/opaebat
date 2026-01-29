/**
 * WebSocket client representation
 */

import type { WebSocket } from 'ws';
import type { WsEvent } from './WsEvents.js';
import { logger } from '../logger.js';

export class WsClient {
  public userId: string | null = null;
  public isAuthenticated = false;
  /**
   * FLOW WS-SUBSCRIBE: текущий инструмент, на который подписан клиент.
   * null = нет активной подписки, клиент не получает ценовые события.
   */
  public instrument: string | null = null;

  constructor(private socket: WebSocket) {}

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
