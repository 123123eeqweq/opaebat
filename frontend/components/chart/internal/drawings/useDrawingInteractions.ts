/**
 * useDrawingInteractions - взаимодействие для рисования
 * 
 * FLOW G14: Drawing interactions
 * 
 * Ответственность:
 * - Создание drawings при активации режима
 * - Использование позиции курсора или центра viewport
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - drag / edit (пока)
 * - влияние на pan/zoom
 * - useState
 */

import { useEffect, useRef, RefObject } from 'react';
import type { Viewport } from '../viewport.types';
import type { Drawing } from './drawing.types';
import type { CrosshairState } from '../crosshair/crosshair.types';

interface UseDrawingInteractionsParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  getViewport: () => Viewport | null;
  getCrosshair: () => CrosshairState | null;
  mode: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null; // Режим рисования
  addDrawing: (drawing: Drawing) => void;
}

/**
 * Генерирует уникальный ID для drawing
 */
function generateDrawingId(): string {
  return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Получить позицию для рисования: используем crosshair если активен, иначе центр viewport
 */
function getDrawingPosition(
  viewport: Viewport,
  crosshair: CrosshairState | null,
  width: number,
  height: number
): { time: number; price: number } {
  if (crosshair && crosshair.isActive) {
    // Используем позицию курсора
    return {
      time: crosshair.time,
      price: crosshair.price,
    };
  }

  // Используем центр viewport
  const centerTime = viewport.timeStart + (viewport.timeEnd - viewport.timeStart) / 2;
  const centerPrice = viewport.priceMin + (viewport.priceMax - viewport.priceMin) / 2;

  return {
    time: centerTime,
    price: centerPrice,
  };
}

/**
 * Конвертирует X координату в time
 */
function mapXToTime(x: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return viewport.timeStart;
  return viewport.timeStart + (x / width) * timeRange;
}

/**
 * Конвертирует Y координату в price
 */
function mapYToPrice(y: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return viewport.priceMin;
  return viewport.priceMax - (y / height) * priceRange;
}

export function useDrawingInteractions({
  canvasRef,
  getViewport,
  getCrosshair,
  mode,
  addDrawing,
}: UseDrawingInteractionsParams): void {
  // Состояние для trend line (нужно запомнить первую позицию)
  const trendStartRef = useRef<{ time: number; price: number } | null>(null);
  const lastModeRef = useRef<'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null>(null);

  // Обработка автоматического создания для всех типов линий
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;

    // Если режим изменился или только что активирован
    if (mode && mode !== lastModeRef.current) {
      const crosshair = getCrosshair();
      const position = getDrawingPosition(viewport, crosshair, width, height);

      if (mode === 'horizontal') {
        // Горизонтальная линия: сразу рисуем по текущей цене
        const drawing: Drawing = {
          id: generateDrawingId(),
          type: 'horizontal',
          color: '#3b82f6', // Синий по умолчанию
          price: position.price,
        };
        addDrawing(drawing);
      } else if (mode === 'vertical') {
        // Вертикальная линия: сразу рисуем по текущему времени
        const drawing: Drawing = {
          id: generateDrawingId(),
          type: 'vertical',
          color: '#3b82f6', // Синий по умолчанию
          time: position.time,
        };
        addDrawing(drawing);
      } else if (mode === 'trend') {
        // Трендовая линия: создаем сразу от текущей позиции до позиции со сдвигом
        // Вычисляем сдвиг (примерно 20% от размера viewport)
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const priceRange = viewport.priceMax - viewport.priceMin;
        
        const endTime = position.time + timeRange * 0.2; // Сдвиг вправо на 20%
        const endPrice = position.price - priceRange * 0.1; // Сдвиг вверх на 10% (цена растет вверх)
        
        const drawing: Drawing = {
          id: generateDrawingId(),
          type: 'trend',
          color: '#3b82f6', // Синий по умолчанию
          start: position,
          end: { time: endTime, price: endPrice },
        };
        addDrawing(drawing);
      } else if (mode === 'rectangle') {
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const priceRange = viewport.priceMax - viewport.priceMin;
        const endTime = position.time + timeRange * 0.15;
        const endPrice = position.price - priceRange * 0.1;
        const drawing: Drawing = {
          id: generateDrawingId(),
          type: 'rectangle',
          color: '#3b82f6',
          start: position,
          end: { time: endTime, price: endPrice },
        };
        addDrawing(drawing);
      } else if (mode === 'fibonacci') {
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const priceRange = viewport.priceMax - viewport.priceMin;
        const endTime = position.time + timeRange * 0.2;
        const endPrice = position.price - priceRange * 0.1;
        const drawing: Drawing = {
          id: generateDrawingId(),
          type: 'fibonacci',
          color: '#3b82f6',
          start: position,
          end: { time: endTime, price: endPrice },
        };
        addDrawing(drawing);
      } else if (mode === 'parallel-channel') {
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const priceRange = viewport.priceMax - viewport.priceMin;
        const endTime = position.time + timeRange * 0.2;
        const endPrice = position.price - priceRange * 0.1;
        const offset = -priceRange * 0.08; // вторая линия ниже базовой на 8%
        const drawing: Drawing = {
          id: generateDrawingId(),
          type: 'parallel-channel',
          color: '#3b82f6',
          start: position,
          end: { time: endTime, price: endPrice },
          offset,
        };
        addDrawing(drawing);
      } else if (mode === 'ray') {
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const priceRange = viewport.priceMax - viewport.priceMin;
        const endTime = position.time + timeRange * 0.2;
        const endPrice = position.price - priceRange * 0.1;
        const drawing: Drawing = {
          id: generateDrawingId(),
          type: 'ray',
          color: '#3b82f6',
          start: position,
          end: { time: endTime, price: endPrice },
        };
        addDrawing(drawing);
      } else if (mode === 'arrow') {
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const priceRange = viewport.priceMax - viewport.priceMin;
        const endTime = position.time + timeRange * 0.2;
        const endPrice = position.price - priceRange * 0.1;
        const drawing: Drawing = {
          id: generateDrawingId(),
          type: 'arrow',
          color: '#3b82f6',
          start: position,
          end: { time: endTime, price: endPrice },
        };
        addDrawing(drawing);
      }

      lastModeRef.current = mode;
    }

    // Если режим выключен, сбрасываем состояние
    if (!mode) {
      trendStartRef.current = null;
      lastModeRef.current = null;
    }
  }, [canvasRef, getViewport, getCrosshair, mode, addDrawing]);

  // Сброс состояния trend line при выключении режима
  useEffect(() => {
    if (!mode) {
      trendStartRef.current = null;
      lastModeRef.current = null;
    }
  }, [mode]);
}
