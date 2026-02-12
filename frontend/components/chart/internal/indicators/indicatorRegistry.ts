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
    { id: 'ao', type: 'AwesomeOscillator', period: 34, fastPeriod: 5, color: '#22c55e', enabled: false }, // Awesome Oscillator: гистограмма
    { id: 'macd', type: 'MACD', period: 12, slowPeriod: 26, signalPeriod: 9, color: '#3b82f6', colorD: '#f97316', enabled: false }, // MACD: линия + сигнал + гистограмма
    { id: 'keltner20', type: 'KeltnerChannels', period: 20, atrMult: 2, color: '#a855f7', enabled: false }, // Каналы Кельтнера: EMA + ATR
    { id: 'ichimoku', type: 'Ichimoku', period: 9, basePeriod: 26, spanBPeriod: 52, displacement: 26, color: '#e11d48', colorD: '#2563eb', enabled: false }, // Ишимоку: Tenkan/Kijun/облако/Chikou
    { id: 'atr14', type: 'ATR', period: 14, color: '#f59e0b', enabled: false }, // ATR: волатильность в отдельной зоне
    { id: 'adx14', type: 'ADX', period: 14, color: '#06b6d4', colorD: '#22c55e', enabled: false }, // ADX: сила тренда + +DI/-DI
  ];
}

/**
 * Получить активные (включенные) индикаторы из конфигурации
 */
export function getActiveIndicators(configs: IndicatorConfig[]): IndicatorConfig[] {
  return configs.filter(config => config.enabled === true);
}
