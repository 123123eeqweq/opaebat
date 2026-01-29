/**
 * indicatorRegistry.ts - реестр активных индикаторов
 * 
 * FLOW G12: Indicator registry
 */

import type { IndicatorConfig } from './indicator.types';

/**
 * Получить все доступные индикаторы
 * 
 * Возвращает полный список индикаторов с их конфигурацией
 */
export function getAllIndicators(): IndicatorConfig[] {
  return [
    { id: 'ema20', type: 'EMA', period: 20, color: '#3b82f6', enabled: false }, // Синий
    { id: 'sma50', type: 'SMA', period: 50, color: '#22c55e', enabled: false }, // Зелёный
    { id: 'bb20', type: 'BollingerBands', period: 20, stdDevMult: 2, color: '#8b5cf6', enabled: false }, // Волны Боллинджера: фиолетовый
    { id: 'rsi14', type: 'RSI', period: 14, color: '#f97316', enabled: false }, // Оранжевый
    { id: 'stoch14', type: 'Stochastic', period: 14, periodD: 3, color: '#9333ea', colorD: '#c084fc', enabled: false }, // Фиолетовый %K, светлее %D
    { id: 'momentum10', type: 'Momentum', period: 10, color: '#22c55e', enabled: false }, // Гистограмма: зелёный/красный
  ];
}

/**
 * Получить активные (включенные) индикаторы из конфигурации
 */
export function getActiveIndicators(configs: IndicatorConfig[]): IndicatorConfig[] {
  return configs.filter(config => config.enabled === true);
}
