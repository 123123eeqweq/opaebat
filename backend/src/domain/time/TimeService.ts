/**
 * Time Service - provides server time and UX calculations
 * NO business logic, ONLY UX data
 */

import type { Clock } from './TimeTypes.js';

export class TimeService {
  constructor(private clock: Clock) {}

  /**
   * Get current server time
   */
  now(): number {
    return this.clock.now();
  }

  /**
   * Calculate seconds left until expiration
   * Rules:
   * - Never returns negative
   * - Rounds down
   * - Always calculated from server time
   */
  secondsLeft(expiresAt: number): number {
    const now = this.now();
    const diff = expiresAt - now;
    const seconds = Math.floor(diff / 1000);
    return Math.max(0, seconds); // Never negative
  }

  /**
   * Align timestamp to candle boundary
   * Used for UX (showing when next candle starts)
   */
  alignToCandleBoundary(timestamp: number, timeframeSeconds: number): number {
    return Math.floor(timestamp / (timeframeSeconds * 1000)) * (timeframeSeconds * 1000);
  }
}
