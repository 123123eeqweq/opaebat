/**
 * Backend constants — централизованные значения вместо magic numbers
 */

import type { Timeframe } from '../prices/PriceTypes.js';

/** API version prefix for all routes */
export const API_PREFIX = '/api/v1';

/** Дефолтный payout % при отсутствии данных в БД */
export const DEFAULT_PAYOUT_PERCENT = 75;

/** Допустимый диапазон payout % (валидация) */
export const PAYOUT_MIN = 60;
export const PAYOUT_MAX = 90;

/** Базовый таймфрейм 5s в миллисекундах */
export const BASE_TIMEFRAME_MS = 5000;

/** Маппинг timeframe → секунды (единый источник истины) */
export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '5s': 5,
  '10s': 10,
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '2m': 120,
  '3m': 180,
  '5m': 300,
  '10m': 600,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

/** Конвертация timeframe в миллисекунды */
export function timeframeToMs(timeframe: Timeframe): number {
  const seconds = TIMEFRAME_SECONDS[timeframe] ?? 5;
  return seconds * 1000;
}

/** RealWebSocketHub: базовая задержка переподключения (мс) */
export const WS_HUB_BASE_RECONNECT_DELAY_MS = 2000;

/** RealWebSocketHub: максимальная задержка переподключения (мс) */
export const WS_HUB_MAX_RECONNECT_DELAY_MS = 60000;

/** TradeService: минимальная длительность сделки (секунды) */
export const TRADE_MIN_EXPIRATION_SECONDS = 5;

/** TradeService: максимальная длительность сделки (секунды) */
export const TRADE_MAX_EXPIRATION_SECONDS = 300;

/** TradeService: шаг длительности сделки (секунды) */
export const TRADE_EXPIRATION_STEP = 5;

/** TradeService: дефолтный payout (80%) */
export const TRADE_PAYOUT_PERCENTAGE = 0.8;

/** FileStorage: максимальный размер аватара (5MB) */
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

/** Rate limit: максимум запросов в окне (глобальный) */
export const RATE_LIMIT_MAX = 100;

/** Rate limit: размер in-memory кэша */
export const RATE_LIMIT_CACHE = 10000;

/** Upload rate limits — защита от abuse */
export const RATE_LIMIT_UPLOAD_MAX = 10;
export const RATE_LIMIT_UPLOAD_WINDOW = '1 hour';

/** Auth rate limits — защита от brute force */
export const RATE_LIMIT_AUTH_LOGIN_MAX = 5;
export const RATE_LIMIT_AUTH_LOGIN_WINDOW = '15 minutes';
export const RATE_LIMIT_AUTH_REGISTER_MAX = 3;
export const RATE_LIMIT_AUTH_REGISTER_WINDOW = '1 hour';
export const RATE_LIMIT_AUTH_2FA_MAX = 5;
export const RATE_LIMIT_AUTH_2FA_WINDOW = '5 minutes';

/** LineChart: количество точек в snapshot */
export const LINE_CHART_SNAPSHOT_TAKE = 600;

/** LineChart: дефолтный limit для history */
export const LINE_CHART_HISTORY_LIMIT = 300;

/** WebSocket: heartbeat interval (ms) - ping clients for keep-alive */
export const WS_HEARTBEAT_INTERVAL_MS = 30000;

/** WebSocket: max messages per client per second (rate limit — защита от спама) */
export const WS_RATE_LIMIT_MAX = 100;

/** WebSocket: rate limit window (ms) — 1 sec */
export const WS_RATE_LIMIT_WINDOW_MS = 1000;
