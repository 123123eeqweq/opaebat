/**
 * Terminal Snapshot types
 */

import type { Timeframe } from '../../prices/PriceTypes.js';
import type { MarketStatus, MarketAlternative } from './MarketStatus.js';

export interface SnapshotCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number; // timestamp
  endTime: number; // timestamp
}

export interface TerminalSnapshot {
  instrument: string; // FLOW P4: instrumentId (BTCUSD, EURUSD, …)
  user: {
    id: string;
    email: string;
  };
  accounts: {
    id: string;
    type: 'demo' | 'real';
    balance: string;
    currency: string;
    isActive: boolean;
  }[];
  activeAccount: {
    id: string;
    type: 'demo' | 'real';
    balance: string;
    currency: string;
  } | null;
  price: {
    asset: string;
    value: number;
    timestamp: number;
  } | null; // FLOW C-MARKET-CLOSED: может быть null когда рынок закрыт
  candles: {
    timeframe: Timeframe;
    items: SnapshotCandle[];
  };
  openTrades: {
    id: string;
    direction: 'CALL' | 'PUT';
    amount: string;
    entryPrice: string;
    expiresAt: number; // timestamp
    payout: string;
    secondsLeft: number; // UX data - calculated on server
  }[];
  serverTime: number; // timestamp
  // FLOW C-MARKET-CLOSED: статус рынка
  marketOpen: boolean;
  marketStatus: MarketStatus;
  // FLOW C-MARKET-COUNTDOWN: время следующего открытия рынка (ISO string UTC)
  nextMarketOpenAt: string | null;
  // FLOW C-MARKET-ALTERNATIVES: топ-5 альтернативных пар с наибольшей доходностью
  topAlternatives: MarketAlternative[];
}
