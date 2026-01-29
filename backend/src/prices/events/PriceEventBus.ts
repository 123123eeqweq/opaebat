/**
 * Simple event bus for price events
 */

import type { PriceEvent, PriceEventType } from '../PriceTypes.js';

type EventHandler = (event: PriceEvent) => void;

export class PriceEventBus {
  private handlers: Map<PriceEventType, Set<EventHandler>> = new Map();

  /**
   * Subscribe to event type
   */
  on(eventType: PriceEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Emit event
   */
  emit(event: PriceEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}
