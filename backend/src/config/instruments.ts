/**
 * FLOW P1 — Instrument config
 *
 * id = symbol key (EURUSD, GBPUSD, …).
 * digits = precision for price display.
 * Engine params = initialPrice, bounds, volatility, tickInterval for OTC engine.
 */

import type { Instrument } from '../domain/instruments/InstrumentTypes.js';
import type { PriceConfig } from '../prices/PriceTypes.js';

export interface InstrumentConfig extends Instrument {
  /** Engine params for OTC price generator */
  engine: Omit<PriceConfig, 'asset'> & { asset: string };
}

const forex = (
  id: string,
  base: string,
  quote: string,
  digits: number,
  initialPrice: number,
  minPrice: number,
  maxPrice: number,
): InstrumentConfig => ({
  id,
  base,
  quote,
  digits,
  engine: {
    asset: `${base}/${quote}`,
    initialPrice,
    minPrice,
    maxPrice,
    volatility: 0.0002,
    tickInterval: 500,
  },
});

export const INSTRUMENTS: Record<string, InstrumentConfig> = {
  EURUSD: forex('EURUSD', 'EUR', 'USD', 5, 1.08, 0.95, 1.25),
  GBPUSD: forex('GBPUSD', 'GBP', 'USD', 5, 1.27, 1.0, 1.5),
  USDCAD: forex('USDCAD', 'USD', 'CAD', 5, 1.36, 1.2, 1.5),
  USDCHF: forex('USDCHF', 'USD', 'CHF', 5, 0.88, 0.8, 1.0),
  AUDCAD: forex('AUDCAD', 'AUD', 'CAD', 5, 0.88, 0.8, 1.0),
  AUDCHF: forex('AUDCHF', 'AUD', 'CHF', 5, 0.57, 0.5, 0.65),
  CADJPY: forex('CADJPY', 'CAD', 'JPY', 3, 110, 95, 125),
  EURJPY: forex('EURJPY', 'EUR', 'JPY', 3, 165, 140, 175),
  GBPJPY: forex('GBPJPY', 'GBP', 'JPY', 3, 200, 165, 220),
  NZDUSD: forex('NZDUSD', 'NZD', 'USD', 5, 0.61, 0.52, 0.72),
  NZDJPY: forex('NZDJPY', 'NZD', 'JPY', 3, 97, 82, 110),
  EURCHF: forex('EURCHF', 'EUR', 'CHF', 5, 0.95, 0.88, 1.02),
  EURNZD: forex('EURNZD', 'EUR', 'NZD', 5, 1.75, 1.55, 1.95),
  GBPAUD: forex('GBPAUD', 'GBP', 'AUD', 5, 1.95, 1.7, 2.2),
  CHFNOK: forex('CHFNOK', 'CHF', 'NOK', 4, 12.0, 10.5, 13.5),
  UAHUSD: forex('UAHUSD', 'UAH', 'USD', 5, 0.025, 0.02, 0.03),
  BTCUSD: {
    id: 'BTCUSD',
    base: 'BTC',
    quote: 'USD',
    digits: 2,
    engine: {
      asset: 'BTC/USD',
      initialPrice: 50000,
      minPrice: 30000,
      maxPrice: 70000,
      volatility: 0.001,
      tickInterval: 500,
    },
  },
  ETHUSD: {
    id: 'ETHUSD',
    base: 'ETH',
    quote: 'USD',
    digits: 2,
    engine: {
      asset: 'ETH/USD',
      initialPrice: 3000,
      minPrice: 2000,
      maxPrice: 4500,
      volatility: 0.001,
      tickInterval: 500,
    },
  },
  SOLUSD: {
    id: 'SOLUSD',
    base: 'SOL',
    quote: 'USD',
    digits: 2,
    engine: {
      asset: 'SOL/USD',
      initialPrice: 150,
      minPrice: 80,
      maxPrice: 250,
      volatility: 0.0015,
      tickInterval: 500,
    },
  },
  BNBUSD: {
    id: 'BNBUSD',
    base: 'BNB',
    quote: 'USD',
    digits: 2,
    engine: {
      asset: 'BNB/USD',
      initialPrice: 600,
      minPrice: 400,
      maxPrice: 800,
      volatility: 0.001,
      tickInterval: 500,
    },
  },
};

export const DEFAULT_INSTRUMENT_ID = 'EURUSD';

export function getInstrumentIds(): string[] {
  return Object.keys(INSTRUMENTS);
}

export function getInstrument(id: string): InstrumentConfig | undefined {
  return INSTRUMENTS[id];
}

export function getInstrumentOrDefault(id: string | undefined): InstrumentConfig {
  const key = id || DEFAULT_INSTRUMENT_ID;
  const inst = INSTRUMENTS[key];
  if (!inst) return INSTRUMENTS[DEFAULT_INSTRUMENT_ID];
  return inst;
}

/** Resolve instrumentId from symbol "EUR/USD" or id "EURUSD" */
export function getInstrumentIdBySymbol(symbolOrId: string): string {
  if (!symbolOrId) return DEFAULT_INSTRUMENT_ID;
  const found = Object.entries(INSTRUMENTS).find(
    ([_, c]) => c.engine.asset === symbolOrId || c.id === symbolOrId,
  );
  return found ? found[0] : symbolOrId.replace(/\//g, '') || DEFAULT_INSTRUMENT_ID;
}
