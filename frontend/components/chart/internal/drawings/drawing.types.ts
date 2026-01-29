/**
 * drawing.types.ts - типы для системы рисования
 * 
 * FLOW G14: Drawing types
 */

export type DrawingType = 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow';

export type DrawingBase = {
  id: string;
  type: DrawingType;
  color: string;
};

export type HorizontalLine = DrawingBase & {
  type: 'horizontal';
  price: number;
};

export type VerticalLine = DrawingBase & {
  type: 'vertical';
  time: number;
};

export type TrendLine = DrawingBase & {
  type: 'trend';
  start: { time: number; price: number };
  end: { time: number; price: number };
};

export type Rectangle = DrawingBase & {
  type: 'rectangle';
  start: { time: number; price: number };
  end: { time: number; price: number };
};

/** Фибоначчи-ретрасмент: линия от start до end + уровни 0, 23.6, 38.2, 50, 61.8, 78.6, 100% */
export type Fibonacci = DrawingBase & {
  type: 'fibonacci';
  start: { time: number; price: number };
  end: { time: number; price: number };
};

/** Параллельный канал: базовая линия start→end + вторая линия со сдвигом offset по цене */
export type ParallelChannel = DrawingBase & {
  type: 'parallel-channel';
  start: { time: number; price: number };
  end: { time: number; price: number };
  offset: number; // сдвиг второй линии по цене относительно базовой
};

/** Луч: начало в start, направление через end, линия тянется до границы экрана */
export type Ray = DrawingBase & {
  type: 'ray';
  start: { time: number; price: number };
  end: { time: number; price: number };
};

/** Стрелка: линия от start до end с наконечником на конце */
export type Arrow = DrawingBase & {
  type: 'arrow';
  start: { time: number; price: number };
  end: { time: number; price: number };
};

export type Drawing = HorizontalLine | VerticalLine | TrendLine | Rectangle | Fibonacci | ParallelChannel | Ray | Arrow;

/**
 * FLOW G16: Drawing edit types
 */
export type DrawingEditMode =
  | 'move'
  | 'resize-start'
  | 'resize-end'
  | 'resize-offset' // ручка параллельной линии (параллельный канал)
  | 'resize-tl'
  | 'resize-tr'
  | 'resize-bl'
  | 'resize-br';

export type DrawingEditState = {
  drawingId: string;
  mode: DrawingEditMode;
  startMouse: { x: number; y: number };
  startData: Drawing; // snapshot drawing before edit
};
