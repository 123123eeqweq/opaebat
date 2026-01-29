/**
 * FLOW T5 — Format Server Time (Pure Function)
 * Только входной ts, без Date.now(). Пример: "19:45:02 UTC+2"
 * offsetMinutes = -date.getTimezoneOffset() (клиентский offset: положительный = восток)
 */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatServerTime(ts: number, offsetMinutes: number): string {
  const date = new Date(ts);
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offsetHours = Math.abs(Math.round(offsetMinutes / 60));
  return `${hh}:${mm}:${ss} UTC${sign}${offsetHours}`;
}
