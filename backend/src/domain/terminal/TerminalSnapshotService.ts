/**
 * Terminal Snapshot Service - orchestrates snapshot data collection
 * NO business logic, NO mutations, ONLY data aggregation
 */

import type { TerminalSnapshotPort } from '../../ports/terminal/TerminalSnapshotPort.js';
import type { TerminalSnapshot } from './TerminalSnapshotTypes.js';
import type { Timeframe } from '../../prices/PriceTypes.js';

export class TerminalSnapshotService {
  constructor(private snapshotPort: TerminalSnapshotPort) {}

  /**
   * Get terminal snapshot
   * Pure orchestration - no business logic
   * instrument = instrumentId (BTCUSD, EURUSD, …)
   */
  async getSnapshot(userId: string, instrument: string, timeframe: Timeframe): Promise<TerminalSnapshot> {
    return this.snapshotPort.getSnapshot(userId, instrument, timeframe);
  }
}
