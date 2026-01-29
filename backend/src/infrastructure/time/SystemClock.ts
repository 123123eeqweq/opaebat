/**
 * System Clock - implementation of Clock port
 */

import type { Clock } from '../../domain/time/TimeTypes.js';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
