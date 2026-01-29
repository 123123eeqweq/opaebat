/**
 * crosshair.types.ts - типы для crosshair
 * 
 * FLOW G7: Crosshair types
 */

export type CrosshairState = {
  isActive: boolean;
  x: number; // canvas px
  y: number; // canvas px
  time: number; // timestamp под курсором
  price: number; // price под курсором
};
