/**
 * WebSocket Manager - manages clients and broadcasts events
 * NO business logic, NO Prisma, NO domain knowledge
 */

import type { WsEvent } from './WsEvents.js';
import { WsClient } from './WsClient.js';
import { logger } from '../logger.js';
import { WS_HEARTBEAT_INTERVAL_MS } from '../../config/constants.js';
import { wsConnectionsTotal, wsConnectionsActive } from '../../modules/metrics/metrics.js';

export class WebSocketManager {
  private clients: Set<WsClient> = new Set();
  private userClients: Map<string, Set<WsClient>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Register client
   */
  register(client: WsClient): void {
    this.clients.add(client);
    wsConnectionsTotal.inc({ event: 'connect' });
    wsConnectionsActive.inc();

    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client);
    }

    logger.debug(`WebSocket client registered. Total: ${this.clients.size}, userId: ${client.userId}, authenticated: ${client.isAuthenticated}`);
  }

  /**
   * Unregister client
   */
  unregister(client: WsClient): void {
    this.clients.delete(client);
    wsConnectionsTotal.inc({ event: 'disconnect' });
    wsConnectionsActive.dec();

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
    let subscribedClients = 0;

    for (const client of this.clients) {
      if (!client.isAuthenticated) {
        continue;
      }

      // Подсчитываем подписанных клиентов
      if (client.subscriptions.has(instrument)) {
        subscribedClients++;
      }

      // клиент не подписан на этот инструмент — пропускаем
      if (!client.subscriptions.has(instrument)) {
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
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Start heartbeat - ping all clients periodically for keep-alive.
   * Clients that don't respond to pong will be detected and connection closed by ws library.
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      logger.warn('WebSocket heartbeat already running');
      return;
    }
    this.heartbeatInterval = setInterval(() => {
      const deadClients: WsClient[] = [];
      for (const client of this.clients) {
        if (!client.isAuthenticated) continue;
        try {
          if (client.isOpen()) {
            client.ping();
          } else {
            deadClients.push(client);
          }
        } catch {
          deadClients.push(client);
        }
      }
      deadClients.forEach((c) => this.unregister(c));
    }, WS_HEARTBEAT_INTERVAL_MS);
    logger.info(`WebSocket heartbeat started (interval: ${WS_HEARTBEAT_INTERVAL_MS}ms)`);
  }

  /**
   * Stop heartbeat interval
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('WebSocket heartbeat stopped');
    }
  }
}
