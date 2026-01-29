/**
 * useDrawings - состояние системы рисования
 * 
 * FLOW G14: Drawing state management
 * 
 * Ответственность:
 * - Хранение drawings в памяти
 * - Добавление/удаление drawings
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - useState
 * - мутация viewport
 * - влияние на candles/indicators
 */

import { useRef } from 'react';
import type { Drawing } from './drawing.types';

interface UseDrawingsReturn {
  getDrawings: () => Drawing[];
  addDrawing: (drawing: Drawing) => void;
  removeDrawing: (id: string) => void;
  updateDrawing: (id: string, nextDrawing: Drawing) => void;
  clearDrawings: () => void;
}

export function useDrawings(): UseDrawingsReturn {
  // Хранение через useRef
  const drawingsRef = useRef<Drawing[]>([]);

  /**
   * Получить все drawings
   */
  const getDrawings = (): Drawing[] => {
    return drawingsRef.current;
  };

  /**
   * Добавить drawing
   */
  const addDrawing = (drawing: Drawing): void => {
    drawingsRef.current = [...drawingsRef.current, drawing];
  };

  /**
   * Удалить drawing по id
   */
  const removeDrawing = (id: string): void => {
    drawingsRef.current = drawingsRef.current.filter(d => d.id !== id);
  };

  /**
   * Обновить drawing по id
   */
  const updateDrawing = (id: string, nextDrawing: Drawing): void => {
    drawingsRef.current = drawingsRef.current.map(d => 
      d.id === id ? nextDrawing : d
    );
  };

  /**
   * Очистить все drawings
   */
  const clearDrawings = (): void => {
    drawingsRef.current = [];
  };

  return {
    getDrawings,
    addDrawing,
    removeDrawing,
    updateDrawing,
    clearDrawings,
  };
}
