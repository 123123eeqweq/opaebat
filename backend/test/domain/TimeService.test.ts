/**
 * Domain tests: TimeService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TimeService } from '../../src/domain/time/TimeService.js';
import { mockClock } from '../helpers/mocks.js';

describe('TimeService', () => {
  let timeService: TimeService;
  let clock: ReturnType<typeof mockClock>;

  beforeEach(() => {
    clock = mockClock();
    timeService = new TimeService(clock);
  });

  describe('now', () => {
    it('should return current server time', () => {
      const now = Date.now();
      clock.setTime(now);

      expect(timeService.now()).toBe(now);
    });
  });

  describe('secondsLeft', () => {
    it('should calculate seconds left correctly', () => {
      const now = 1000000; // Base time
      const expiresAt = now + 30000; // 30 seconds later

      clock.setTime(now);

      expect(timeService.secondsLeft(expiresAt)).toBe(30);
    });

    it('should round down', () => {
      const now = 1000000;
      const expiresAt = now + 35999; // 35.999 seconds

      clock.setTime(now);

      expect(timeService.secondsLeft(expiresAt)).toBe(35); // Rounded down
    });

    it('should never return negative', () => {
      const now = 1000000;
      const expiresAt = now - 1000; // Already expired

      clock.setTime(now);

      expect(timeService.secondsLeft(expiresAt)).toBe(0); // Not negative
    });

    it('should return 0 when exactly expired', () => {
      const now = 1000000;
      const expiresAt = now;

      clock.setTime(now);

      expect(timeService.secondsLeft(expiresAt)).toBe(0);
    });

    it('should update as time advances', () => {
      const now = 1000000;
      const expiresAt = now + 30000; // 30 seconds

      clock.setTime(now);
      expect(timeService.secondsLeft(expiresAt)).toBe(30);

      clock.advance(10000); // Advance 10 seconds
      expect(timeService.secondsLeft(expiresAt)).toBe(20);

      clock.advance(20000); // Advance 20 more seconds
      expect(timeService.secondsLeft(expiresAt)).toBe(0);
    });

    it('should match serverTime calculation', () => {
      const serverTime = timeService.now();
      const expiresAt = serverTime + 5000; // 5 seconds

      const secondsLeft = timeService.secondsLeft(expiresAt);
      const calculated = Math.floor((expiresAt - serverTime) / 1000);

      expect(secondsLeft).toBe(calculated);
    });
  });

  describe('alignToCandleBoundary', () => {
    it('should align to 5s boundary', () => {
      const timestamp = 1000123; // Random timestamp
      const aligned = timeService.alignToCandleBoundary(timestamp, 5);

      // Should be divisible by 5000
      expect(aligned % 5000).toBe(0);
      expect(aligned).toBeLessThanOrEqual(timestamp);
    });

    it('should align to 1m boundary', () => {
      const timestamp = 1000123;
      const aligned = timeService.alignToCandleBoundary(timestamp, 60);

      // Should be divisible by 60000
      expect(aligned % 60000).toBe(0);
      expect(aligned).toBeLessThanOrEqual(timestamp);
    });
  });
});
