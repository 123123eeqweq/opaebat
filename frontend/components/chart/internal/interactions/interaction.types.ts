/**
 * interaction.types.ts - типы для взаимодействий с графиком
 * 
 * FLOW G5: Interactions types
 */

export type InteractionState = {
  isDragging: boolean;
  lastX: number | null;
};

/**
 * InteractionZone - hit-зона для кликов по canvas
 *
 * Используется для:
 * - FLOW A2: Price Alert "+" рядом с price label
 */
export type InteractionZone =
  | {
      type: 'add-alert';
      x: number;
      y: number;
      width: number;
      height: number;
      price: number;
    };
