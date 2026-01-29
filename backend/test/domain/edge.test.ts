/**
 * Edge case tests
 */

import { describe, it, expect } from 'vitest';
import { TimeService } from '../../src/domain/time/TimeService.js';
import { mockClock } from '../helpers/mocks.js';

describe('Edge Cases', () => {
  describe('TimeService', () => {
    it('should handle expiration = 5s (minimum)', () => {
      const clock = mockClock();
      const timeService = new TimeService(clock);
      const now = 1000000;
      const expiresAt = now + 5000; // Exactly 5 seconds

      clock.setTime(now);
      expect(timeService.secondsLeft(expiresAt)).toBe(5);
    });

    it('should handle expiration = 300s (maximum)', () => {
      const clock = mockClock();
      const timeService = new TimeService(clock);
      const now = 1000000;
      const expiresAt = now + 300000; // Exactly 300 seconds (5 minutes)

      clock.setTime(now);
      expect(timeService.secondsLeft(expiresAt)).toBe(300);
    });

    it('should handle server restart simulation (time jump)', () => {
      const clock = mockClock();
      const timeService = new TimeService(clock);
      const now = 1000000;
      const expiresAt = now + 30000; // 30 seconds

      clock.setTime(now);
      expect(timeService.secondsLeft(expiresAt)).toBe(30);

      // Simulate server restart - time jumps forward
      clock.setTime(now + 35000); // 35 seconds later
      expect(timeService.secondsLeft(expiresAt)).toBe(0); // Already expired
    });
  });
});
