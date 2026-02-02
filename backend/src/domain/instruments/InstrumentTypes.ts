/**
 * FLOW P1 — Instrument Model (Domain)
 *
 * Один терминал — один актив. Snapshot + WS всегда для текущего инструмента.
 */

export interface Instrument {
  id: string; // 'BTCUSD', 'EURUSD', 'AUDCAD'
  base: string; // BTC, EUR, AUD
  quote: string; // USD, CAD
  digits: number; // price precision (2 for BTC, 5 for forex)
  // 🔥 FLOW I-PAYOUT: Доходность инструмента
  payoutPercent?: number; // 60–90%
}
