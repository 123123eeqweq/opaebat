/**
 * history.types.ts - типы для загрузки истории
 * 
 * FLOW G6: History Loading types
 */

export type HistoryRequest = {
  asset: string;
  timeframe: string;
  toTime: number; // загружаем ДО этого времени
  limit: number; // сколько свечей
};

export type HistoryState = {
  isLoading: boolean;
  hasMore: boolean;
};
