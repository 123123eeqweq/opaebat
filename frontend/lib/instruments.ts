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
  // FLOW R-MULTI: Real market pairs (18 пар)
  { id: 'AUDCHF_REAL', label: 'AUD/CHF Real', digits: 5 },
  { id: 'AUDJPY_REAL', label: 'AUD/JPY Real', digits: 3 },
  { id: 'EURGBP_REAL', label: 'EUR/GBP Real', digits: 5 },
  { id: 'EURUSD_REAL', label: 'EUR/USD Real', digits: 5 },
  { id: 'AUDCAD_REAL', label: 'AUD/CAD Real', digits: 5 },
  { id: 'EURJPY_REAL', label: 'EUR/JPY Real', digits: 3 },
  { id: 'EURAUD_REAL', label: 'EUR/AUD Real', digits: 5 },
  { id: 'GBPCAD_REAL', label: 'GBP/CAD Real', digits: 5 },
  { id: 'GBPUSD_REAL', label: 'GBP/USD Real', digits: 5 },
  { id: 'USDCHF_REAL', label: 'USD/CHF Real', digits: 5 },
  { id: 'GBPJPY_REAL', label: 'GBP/JPY Real', digits: 3 },
  { id: 'CHFJPY_REAL', label: 'CHF/JPY Real', digits: 3 },
  { id: 'USDCAD_REAL', label: 'USD/CAD Real', digits: 5 },
  { id: 'USDJPY_REAL', label: 'USD/JPY Real', digits: 3 },
  { id: 'GBPCHF_REAL', label: 'GBP/CHF Real', digits: 5 },
  { id: 'EURCAD_REAL', label: 'EUR/CAD Real', digits: 5 },
  { id: 'CADJPY_REAL', label: 'CAD/JPY Real', digits: 3 },
  { id: 'CADCHF_REAL', label: 'CAD/CHF Real', digits: 5 },
  
  // OTC pairs (существующие)
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
