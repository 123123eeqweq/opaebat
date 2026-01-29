/**
 * WebSocket Manager - manages clients and broadcasts events
 * NO business logic, NO Prisma, NO domain knowledge
 */

import type { WsEvent } from './WsEvents.js';
import { WsClient } from './WsClient.js';
import { logger } from '../logger.js';

export class WebSocketManager {
  private clients: Set<WsClient> = new Set();
  private userClients: Map<string, Set<WsClient>> = new Map();

  /**
   * Register client
   */
  register(client: WsClient): void {
    this.clients.add(client);

    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client);
    }

    logger.debug(`WebSocket client registered. Total: ${this.clients.size}`);
  }

  /**
   * Unregister client
   */
  unregister(client: WsClient): void {
    this.clients.delete(client);

    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      if (userClients) {
        userClients.delete(client);
        if (userClients.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    logger.debug(`WebSocket client unregistered. Total: ${this.clients.size}`);
  }

  /**
   * Broadcast event to all authenticated clients
   */
  broadcast(event: WsEvent): void {
    let sent = 0;
    const deadClients: WsClient[] = [];

    for (const client of this.clients) {
      if (!client.isAuthenticated) {
        continue;
      }

      try {
        if (!client.isOpen()) {
          deadClients.push(client);
          continue;
        }

        client.send(event);
        sent++;
      } catch (error) {
        logger.error('Failed to send broadcast:', error);
        deadClients.push(client);
      }
    }

    // Clean up dead clients
    deadClients.forEach((client) => this.unregister(client));

    if (sent > 0) {
      logger.debug(`Broadcasted ${event.type} to ${sent} clients`);
    }
  }

  /**
   * Send event to specific user
   */
  sendToUser(userId: string, event: WsEvent): void {
    const userClients = this.userClients.get(userId);
    if (!userClients) {
      return;
    }

    const deadClients: WsClient[] = [];

    for (const client of userClients) {
      try {
        if (!client.isOpen()) {
          deadClients.push(client);
          continue;
        }

        client.send(event);
      } catch (error) {
        logger.error('Failed to send to user:', error);
        deadClients.push(client);
      }
    }

    // Clean up dead clients
    deadClients.forEach((client) => this.unregister(client));
  }

  /**
   * Broadcast event только клиентам, подписанным на конкретный инструмент.
   *
   * Используем для price/update и candle/*.
   */
  broadcastToInstrument(instrument: string, event: WsEvent): void {
    let sent = 0;
    const deadClients: WsClient[] = [];

    for (const client of this.clients) {
      if (!client.isAuthenticated) {
        continue;
      }

      // клиент не подписан на этот инструмент — пропускаем
      if (client.instrument !== instrument) {
        continue;
      }

      try {
        if (!client.isOpen()) {
          deadClients.push(client);
          continue;
        }

        client.send(event);
        sent++;
      } catch (error) {
        logger.error('Failed to send broadcast to instrument:', error);
        deadClients.push(client);
      }
    }

    deadClients.forEach((client) => this.unregister(client));

    if (sent > 0) {
      logger.debug(`Broadcasted ${event.type} for ${instrument} to ${sent} clients`);
    }
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}
