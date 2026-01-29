/**
 * useCandleAnimator - анимация live-свечи
 * 
 * Ответственность:
 * - Плавная анимация live-свечи при обновлении цены
 * - Анимация close, high, low
 * - Только presentation layer (не мутирует data)
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - useState
 * - мутация data layer
 * - анимация закрытых свечей
 * - follow mode, pan, zoom
 */

import { useRef } from 'react';
import type { Candle } from './chart.types';

interface UseCandleAnimatorParams {
  getLiveCandle: () => Candle | null;
}

interface UseCandleAnimatorReturn {
  getAnimatedCandle: () => Candle | null;
  onPriceUpdate: (price: number) => void;
  onCandleClose: () => void;
  update: (now: number) => void;
  reset: () => void; // 🔥 FLOW T1: сброс анимации при смене timeframe
}

type AnimatedState = {
  open: number;
  close: number; // Анимируется
  truthHigh: number; // Реальные экстремумы из data layer (обновляются мгновенно)
  truthLow: number;  // Реальные экстремумы из data layer (обновляются мгновенно)
  visualHigh: number; // Для рендера (не опережает тело, но помнит truth)
  visualLow: number;  // Для рендера (не опережает тело, но помнит truth)
};

type AnimationState = {
  from: number;
  to: number;
  startTime: number;
  duration: number;
  active: boolean;
  /** Значения visual high/low в момент старта анимации — фитиль догоняет тело с тем же прогрессом */
  startVisualHigh: number;
  startVisualLow: number;
};

// Утилиты для анимации
const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

// easeOutCubic
const ease = (t: number): number =>
  1 - Math.pow(1 - t, 3);

export function useCandleAnimator({
  getLiveCandle,
}: UseCandleAnimatorParams): UseCandleAnimatorReturn {
  // Анимированное состояние (presentation)
  const animatedRef = useRef<AnimatedState | null>(null);

  // Состояние анимации
  const animationRef = useRef<AnimationState>({
    from: 0,
    to: 0,
    startTime: 0,
    duration: 350, // ms — оптимально под price:update ~500ms
    active: false,
    startVisualHigh: 0,
    startVisualLow: 0,
  });

  /**
   * Инициализация при первом появлении live-свечи
   */
  const ensureInitialized = (): void => {
    const live = getLiveCandle();
    if (!live) return;

    if (!animatedRef.current) {
      animatedRef.current = {
        open: live.open,
        close: live.close,
        truthHigh: live.high, // Реальные экстремумы из data layer
        truthLow: live.low,
        visualHigh: live.high, // Инициализируем visual = truth
        visualLow: live.low,
      };
    }
  };

  /**
   * Вызывается при price:update
   */
  const onPriceUpdate = (price: number): void => {
    ensureInitialized();
    const animated = animatedRef.current;
    const live = getLiveCandle();
    if (!animated || !live) return;

    // 1. Truth обновляется СРАЗУ (реальные экстремумы из data layer)
    animated.truthHigh = live.high;
    animated.truthLow = live.low;

    // 2. Запускаем анимацию: тело (close) и фитиль (visualHigh/Low) с одним прогрессом
    // Запоминаем текущие visual — фитиль будет плавно догонять truth с тем же eased, что и close
    animationRef.current = {
      from: animated.close,
      to: price,
      startTime: performance.now(),
      duration: animationRef.current.duration,
      active: true,
      startVisualHigh: animated.visualHigh,
      startVisualLow: animated.visualLow,
    };
  };

  /**
   * Вызывается при candle:close
   */
  const onCandleClose = (): void => {
    // Сбрасываем animator — новая свеча начнётся с чистого состояния
    animatedRef.current = null;
    animationRef.current.active = false;
  };

  /**
   * Вызывается КАЖДЫЙ КАДР из RAF
   */
  const update = (now: number): void => {
    ensureInitialized();

    const animated = animatedRef.current;
    const anim = animationRef.current;
    const live = getLiveCandle();
    
    if (!animated) return;

    // Если анимация активна, обновляем значения
    if (anim.active) {
      const progress = clamp(
        (now - anim.startTime) / anim.duration,
        0,
        1
      );

      const eased = ease(progress);
      const value = lerp(anim.from, anim.to, eased);

      animated.close = value;

      // Фитиль анимируется с тем же прогрессом (eased), что и тело — нет «фитиль впереди, тело догоняет»
      animated.visualHigh = lerp(anim.startVisualHigh, animated.truthHigh, eased);
      animated.visualLow = lerp(anim.startVisualLow, animated.truthLow, eased);

      // Клампим: тело не выходит за границы фитиля
      const bodyTop = Math.min(animated.open, value);
      const bodyBottom = Math.max(animated.open, value);
      animated.visualHigh = Math.max(animated.visualHigh, bodyBottom);
      animated.visualLow = Math.min(animated.visualLow, bodyTop);

      if (progress === 1) {
        anim.active = false;
      }
    } else if (live) {
      // Если анимация не активна, синхронизируем с реальными данными
      animated.close = live.close;
      // Обновляем truth из live свечи
      animated.truthHigh = live.high;
      animated.truthLow = live.low;
      // Вычисляем visual (не опережают тело, но помнят truth)
      if (live.high > live.close) {
        animated.visualHigh = live.high;
      } else {
        animated.visualHigh = Math.max(animated.open, live.close);
      }

      if (live.low < live.close) {
        animated.visualLow = live.low;
      } else {
        animated.visualLow = Math.min(animated.open, live.close);
      }
    }
  };

  /**
   * Получить анимированную live-свечу
   */
  const getAnimatedCandle = (): Candle | null => {
    const live = getLiveCandle();
    const animated = animatedRef.current;
    if (!live || !animated) return null;

    return {
      ...live,
      open: animated.open,
      close: animated.close,
      high: animated.visualHigh, // Используем visual для рендера
      low: animated.visualLow,   // Используем visual для рендера
      isClosed: false,
    };
  };

  /**
   * 🔥 FLOW T1: Сброс анимации при смене timeframe
   * Очищает все анимированное состояние для полной переинициализации
   */
  const reset = (): void => {
    animatedRef.current = null;
    animationRef.current = {
      from: 0,
      to: 0,
      startTime: 0,
      duration: 350,
      active: false,
      startVisualHigh: 0,
      startVisualLow: 0,
    };
  };

  return {
    getAnimatedCandle,
    onPriceUpdate,
    onCandleClose,
    update,
    reset,
  };
}
