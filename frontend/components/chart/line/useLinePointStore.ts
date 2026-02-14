/**
 * FLOW LP-3: LinePointStore - хранилище price points
 * 
 * Ответственность:
 * - Хранит price points (time, price) - 1 точка в секунду
 * - Поддерживает append (для новых точек) и prepend (для истории)
 * - Ограничивает размер (MAX_POINTS)
 * - НЕ знает про canvas, viewport, рендеринг
 */

import { useRef } from 'react';

export type PricePoint = {
  time: number;   // timestamp (ms), начало секунды
  price: number;
};

const MAX_POINTS = 3000; // Максимальное количество точек в памяти

export function useLinePointStore() {
  const pointsRef = useRef<PricePoint[]>([]);

  /**
   * Добавить новую точку в конец (для live обновлений)
   */
  function push(point: PricePoint): void {
    const arr = pointsRef.current;
    arr.push(point);

    // Ограничиваем размер: удаляем старые точки слева
    if (arr.length > MAX_POINTS) {
      arr.splice(0, arr.length - MAX_POINTS);
    }
  }

  /**
   * Добавить несколько точек в конец
   */
  function appendMany(points: PricePoint[]): void {
    const arr = pointsRef.current;
    arr.push(...points);

    // Ограничиваем размер
    if (arr.length > MAX_POINTS) {
      arr.splice(0, arr.length - MAX_POINTS);
    }
  }

  /**
   * Добавить точки в начало (для infinite scroll истории)
   * 🔥 FIX: Фильтрует дубликаты по timestamp — безопасен при повторном запросе истории
   */
  function prepend(points: PricePoint[]): void {
    const arr = pointsRef.current;

    if (arr.length === 0) {
      arr.push(...points);
    } else {
      // Самая ранняя существующая точка — всё что >= её времени уже есть
      const earliestExisting = arr[0].time;
      // Берём только те точки из history, которые строго раньше существующих
      const filtered = points.filter(p => p.time < earliestExisting);
      if (filtered.length > 0) {
        arr.unshift(...filtered);
      }
    }

    // Ограничиваем размер: удаляем новые точки справа
    if (arr.length > MAX_POINTS) {
      arr.splice(MAX_POINTS);
    }
  }

  /**
   * Получить все точки
   */
  function getAll(): PricePoint[] {
    return pointsRef.current;
  }

  /**
   * Получить первую точку (самую старую)
   */
  function getFirst(): PricePoint | null {
    const points = pointsRef.current;
    return points.length > 0 ? points[0] : null;
  }

  /**
   * Получить последнюю точку (самую новую)
   */
  function getLast(): PricePoint | null {
    const points = pointsRef.current;
    return points.length > 0 ? points[points.length - 1] : null;
  }

  /**
   * Получить точки в диапазоне времени
   */
  function getPointsInRange(timeStart: number, timeEnd: number): PricePoint[] {
    return pointsRef.current.filter(
      (point) => point.time >= timeStart && point.time <= timeEnd
    );
  }

  /**
   * Очистить все точки
   */
  function reset(): void {
    pointsRef.current = [];
  }

  /**
   * Получить количество точек
   */
  function getCount(): number {
    return pointsRef.current.length;
  }

  return {
    push,
    appendMany,
    prepend,
    getAll,
    getFirst,
    getLast,
    getPointsInRange,
    reset,
    getCount,
  };
}
