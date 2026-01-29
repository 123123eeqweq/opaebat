/**
 * Price provider port (interface)
 */

export interface PriceProvider {
  getCurrentPrice(asset: string): Promise<{
    price: number;
    timestamp: number;
  } | null>;
}
