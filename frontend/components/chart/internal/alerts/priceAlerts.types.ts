/**
 * priceAlerts.types.ts - типы для ценовых алертов
 *
 * FLOW A: Price Alerts
 */

export type PriceAlert = {
  id: string;
  price: number;
  triggered: boolean;
};

