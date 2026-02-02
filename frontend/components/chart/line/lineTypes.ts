/**
 * FLOW LINE-0: Data Model для линейного графика
 * 
 * Линейный график работает ТОЛЬКО с тиками (time, price).
 * Он НЕ знает про свечи, таймфреймы, слоты времени.
 */

export type TickPoint = {
  time: number;   // timestamp (ms)
  price: number;
};

export type LineViewport = {
  timeStart: number;  // Начало временного окна
  timeEnd: number;    // Конец временного окна
  autoFollow: boolean; // Автоматически следовать за текущим временем
};
