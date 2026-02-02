/**
 * FLOW R1: Тип источника цены
 * 
 * Определяет, откуда приходят котировки:
 * - 'otc': Генерируются внутри системы (OtcPriceEngine)
 * - 'real': Получаются из внешнего источника (RealPriceEngine)
 */

export type PriceSource = 'otc' | 'real';
