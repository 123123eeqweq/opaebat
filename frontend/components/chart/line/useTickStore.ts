/**
 * FLOW LINE-1: Tick Store - хранилище тиков
 * 
 * Ответственность:
 * - Хранит сырые тики (time, price)
 * - Ограничивает размер (MAX_TICKS)
 * - НЕ знает про canvas, viewport, рендеринг
 */

import { useRef } from 'react';
import type { TickPoint } from './lineTypes';

const MAX_TICKS = 3000; // Максимальное количество тиков в памяти

export function useTickStore() {
  const ticksRef = useRef<TickPoint[]>([]);

  /**
   * Добавить новый тик
   */
  function pushTick(tick: TickPoint): void {
    const arr = ticksRef.current;
    arr.push(tick);

    // Ограничиваем размер: удаляем старые тики слева
    if (arr.length > MAX_TICKS) {
      arr.splice(0, arr.length - MAX_TICKS);
    }
  }

  /**
   * Получить все тики
   */
  function getTicks(): TickPoint[] {
    return ticksRef.current;
  }

  /**
   * Получить тики в диапазоне времени
   */
  function getTicksInRange(timeStart: number, timeEnd: number): TickPoint[] {
    return ticksRef.current.filter(
      (tick) => tick.time >= timeStart && tick.time <= timeEnd
    );
  }

  /**
   * Очистить все тики
   */
  function reset(): void {
    ticksRef.current = [];
  }

  /**
   * Получить количество тиков
   */
  function getCount(): number {
    return ticksRef.current.length;
  }

  /**
   * Получить последний тик (для renderPriceLine)
   */
  function getLastTick(): TickPoint | null {
    const ticks = ticksRef.current;
    return ticks.length > 0 ? ticks[ticks.length - 1] : null;
  }

  return {
    pushTick,
    getTicks,
    getTicksInRange,
    reset,
    getCount,
    getLastTick,
  };
}
