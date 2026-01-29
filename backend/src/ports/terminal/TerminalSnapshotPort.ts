/**
 * Terminal Snapshot Port - interface for snapshot data providers
 * FLOW P4: instrument = instrumentId (BTCUSD, EURUSD, …)
 */

import type { TerminalSnapshot } from '../../domain/terminal/TerminalSnapshotTypes.js';
import type { Timeframe } from '../../prices/PriceTypes.js';

export interface TerminalSnapshotPort {
  getSnapshot(userId: string, instrument: string, timeframe: Timeframe): Promise<TerminalSnapshot>;
}
