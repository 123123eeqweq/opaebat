/**
 * FLOW P6 — Instrument Registry (Frontend)
 * Один терминал — один актив. activeInstrumentRef + reinit при смене.
 */

export const DEFAULT_INSTRUMENT_ID = 'EURUSD';

export interface InstrumentInfo {
  id: string;
  label: string;
  digits: number;
}

export const INSTRUMENTS: InstrumentInfo[] = [
  { id: 'EURUSD', label: 'EUR/USD OTC', digits: 5 },
  { id: 'GBPUSD', label: 'GBP/USD OTC', digits: 5 },
  { id: 'USDCAD', label: 'USD/CAD OTC', digits: 5 },
  { id: 'USDCHF', label: 'USD/CHF OTC', digits: 5 },
  { id: 'AUDCAD', label: 'AUD/CAD OTC', digits: 5 },
  { id: 'AUDCHF', label: 'AUD/CHF OTC', digits: 5 },
  { id: 'CADJPY', label: 'CAD/JPY OTC', digits: 3 },
  { id: 'EURJPY', label: 'EUR/JPY OTC', digits: 3 },
  { id: 'GBPJPY', label: 'GBP/JPY OTC', digits: 3 },
  { id: 'NZDUSD', label: 'NZD/USD OTC', digits: 5 },
  { id: 'NZDJPY', label: 'NZD/JPY OTC', digits: 3 },
  { id: 'EURCHF', label: 'EUR/CHF OTC', digits: 5 },
  { id: 'EURNZD', label: 'EUR/NZD OTC', digits: 5 },
  { id: 'GBPAUD', label: 'GBP/AUD OTC', digits: 5 },
  { id: 'CHFNOK', label: 'CHF/NOK OTC', digits: 4 },
  { id: 'UAHUSD', label: 'UAH/USD OTC', digits: 5 },
  { id: 'BTCUSD', label: 'BTC/USD OTC', digits: 2 },
  { id: 'ETHUSD', label: 'ETH/USD OTC', digits: 2 },
  { id: 'SOLUSD', label: 'SOL/USD OTC', digits: 2 },
  { id: 'BNBUSD', label: 'BNB/USD OTC', digits: 2 },
];

export function getInstrument(id: string): InstrumentInfo | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}

export function getInstrumentOrDefault(id: string | undefined): InstrumentInfo {
  const key = id || DEFAULT_INSTRUMENT_ID;
  return getInstrument(key) ?? INSTRUMENTS[0];
}
