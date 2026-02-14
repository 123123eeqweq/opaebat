/**
 * FLOW LINE-2: Line Viewport - СЕРДЦЕ линейного графика
 * 
 * ИДЕЯ: Viewport — это временное окно, а не индекс.
 * 
 * Поведение:
 * - autoFollow = true: окно автоматически едет вправо за новыми тиками
 * - autoFollow = false: окно зафиксировано (после pan/zoom)
 * - zoom: меняет ширину временного окна
 * - pan: сдвигает окно влево/вправо
 */

import { useRef } from 'react';
import type { LineViewport } from './lineTypes';
import type { TimePriceViewport } from '../internal/render/ui/viewport.types';
import { clampToDataBounds } from '../internal/interactions/math';

/** Начальная ширина временного окна линейного графика (экспортируется для useLineChart) */
export const DEFAULT_WINDOW_MS = 420_000; // 420 секунд (7 минут) по умолчанию
const RIGHT_PADDING_RATIO = 0.30; // 30% свободного места справа

// 🔥 Лимиты масштабирования — viewport не может быть сильно меньше или больше дефолтного
const MIN_WINDOW_MS = DEFAULT_WINDOW_MS * 0.5;  // ~3.5 мин — максимальный zoom in
const MAX_WINDOW_MS = DEFAULT_WINDOW_MS * 1.5;  // ~10.5 мин — максимальный zoom out

// 🔥 FLOW SMOOTH-FOLLOW: Плавная анимация follow mode
const FOLLOW_ANIMATION_DURATION_MS = 320;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function useLineViewport() {
  const now = Date.now();
  const rightPaddingMs = DEFAULT_WINDOW_MS * RIGHT_PADDING_RATIO;
  const viewportRef = useRef<LineViewport>({
    timeEnd: now + rightPaddingMs,
    timeStart: now + rightPaddingMs - DEFAULT_WINDOW_MS,
    autoFollow: true, // 🔥 По умолчанию follow mode ВКЛЮЧЕН
  });
  
  // Кэш для priceMin/priceMax (обновляется извне)
  const priceRangeRef = useRef<{ min: number; max: number } | null>(null);

  // 🔥 FLOW PAN-CLAMP: Границы данных для ограничения pan (обновляется извне)
  const dataBoundsRef = useRef<{ timeMin: number; timeMax: number } | null>(null);

  // 🔥 FLOW SMOOTH-FOLLOW: Состояние анимации
  const followAnimationRef = useRef<{
    targetTimeEnd: number;
    startTimeEnd: number;
    startedAt: number;
  } | null>(null);

  /**
   * Следовать за текущим временем (если autoFollow включен)
   * Viewport включает right padding — свободное место справа от live данных
   * 🔥 Использует плавную анимацию через advanceFollowAnimation
   */
  function followNow(now: number): void {
    if (!viewportRef.current.autoFollow) return;

    const vp = viewportRef.current;
    const windowMs = vp.timeEnd - vp.timeStart;
    const rightPadding = windowMs * RIGHT_PADDING_RATIO;
    
    // Целевой timeEnd = текущее время + right padding
    const targetTimeEnd = now + rightPadding;
    
    // Разница между текущим и целевым положением
    const diff = targetTimeEnd - vp.timeEnd;
    
    // Если viewport слишком далеко от цели (> 5 секунд), снэпим мгновенно
    if (Math.abs(diff) > 5000) {
      vp.timeEnd = targetTimeEnd;
      vp.timeStart = targetTimeEnd - windowMs;
      followAnimationRef.current = null;
      return;
    }

    // 🔥 FLOW SMOOTH-FOLLOW: Устанавливаем цель анимации (если ещё нет или цель изменилась)
    const anim = followAnimationRef.current;
    if (!anim || Math.abs(anim.targetTimeEnd - targetTimeEnd) > 100) {
      followAnimationRef.current = {
        targetTimeEnd,
        startTimeEnd: vp.timeEnd,
        startedAt: performance.now(),
      };
    }
  }

  /**
   * 🔥 FLOW SMOOTH-FOLLOW: Плавная анимация сдвига viewport в follow mode
   * Вызывается каждый кадр из render loop
   */
  function advanceFollowAnimation(now: number): void {
    if (!viewportRef.current.autoFollow) {
      followAnimationRef.current = null;
      return;
    }

    const anim = followAnimationRef.current;
    if (!anim) return;

    const elapsed = now - anim.startedAt;
    const progress = Math.min(1, elapsed / FOLLOW_ANIMATION_DURATION_MS);
    const t = easeOutCubic(progress);

    const vp = viewportRef.current;
    const windowMs = vp.timeEnd - vp.timeStart;
    const newTimeEnd = lerp(anim.startTimeEnd, anim.targetTimeEnd, t);

    vp.timeEnd = newTimeEnd;
    vp.timeStart = newTimeEnd - windowMs;

    if (progress >= 1) {
      followAnimationRef.current = null;
    }
  }

  /**
   * Zoom: изменить ширину временного окна
   * @param factor > 1 = увеличить (меньше времени видно), < 1 = уменьшить (больше времени видно)
   */
  function zoom(factor: number): void {
    const vp = viewportRef.current;
    const center = (vp.timeStart + vp.timeEnd) / 2;
    let newWindowMs = (vp.timeEnd - vp.timeStart) / factor;

    // 🔥 Лимиты масштабирования — не дать уйти за пределы разумного
    newWindowMs = Math.max(MIN_WINDOW_MS, Math.min(MAX_WINDOW_MS, newWindowMs));

    const half = newWindowMs / 2;
    let newTimeStart = center - half;
    let newTimeEnd = center + half;

    // 🔥 FIX: Кламп по данным после zoom (аналогично pan)
    const bounds = dataBoundsRef.current;
    if (bounds) {
      const clamped = clampToDataBounds({
        timeStart: newTimeStart,
        timeEnd: newTimeEnd,
        dataTimeMin: bounds.timeMin,
        dataTimeMax: bounds.timeMax,
      });
      newTimeStart = clamped.timeStart;
      newTimeEnd = clamped.timeEnd;
    }

    vp.timeStart = newTimeStart;
    vp.timeEnd = newTimeEnd;
    vp.autoFollow = false; // После zoom отключаем auto-follow
  }

  /**
   * Pan: сдвинуть окно влево/вправо
   * 🔥 FLOW PAN-CLAMP: Ограничено — минимум 10% viewport пересекается с данными
   * @param deltaMs положительное = вправо (будущее), отрицательное = влево (прошлое)
   */
  function pan(deltaMs: number): void {
    const vp = viewportRef.current;
    vp.autoFollow = false; // После pan отключаем auto-follow

    let newTimeStart = vp.timeStart + deltaMs;
    let newTimeEnd = vp.timeEnd + deltaMs;

    // 🔥 FLOW PAN-CLAMP: Ограничиваем pan по границам данных
    const bounds = dataBoundsRef.current;
    if (bounds) {
      const clamped = clampToDataBounds({
        timeStart: newTimeStart,
        timeEnd: newTimeEnd,
        dataTimeMin: bounds.timeMin,
        dataTimeMax: bounds.timeMax,
      });
      newTimeStart = clamped.timeStart;
      newTimeEnd = clamped.timeEnd;
    }

    vp.timeStart = newTimeStart;
    vp.timeEnd = newTimeEnd;
  }

  /**
   * Сбросить auto-follow (включить автоматическое следование)
   */
  function resetFollow(): void {
    viewportRef.current.autoFollow = true;
  }

  /**
   * Установить auto-follow (включить/выключить автоматическое следование)
   */
  function setAutoFollow(enabled: boolean): void {
    viewportRef.current.autoFollow = enabled;
  }

  /**
   * Установить временное окно вручную
   */
  function setViewport(timeStart: number, timeEnd: number, autoFollow: boolean = false): void {
    viewportRef.current = {
      timeStart,
      timeEnd,
      autoFollow,
    };
  }

  /**
   * FLOW LP-3: Установить временное окно (алиас для setViewport с autoFollow=false)
   */
  function setWindow(timeStart: number, timeEnd: number): void {
    setViewport(timeStart, timeEnd, false);
  }

  /**
   * Получить текущий viewport
   */
  function getViewport(): LineViewport {
    return { ...viewportRef.current };
  }

  /**
   * Получить ширину временного окна в миллисекундах
   */
  function getWindowMs(): number {
    return viewportRef.current.timeEnd - viewportRef.current.timeStart;
  }

  /**
   * Обновить диапазон цен (вызывается извне при вычислении priceRange)
   */
  function updatePriceRange(min: number, max: number): void {
    priceRangeRef.current = { min, max };
  }

  /**
   * 🔥 FLOW PAN-CLAMP: Обновить границы данных (вызывается извне при изменении данных)
   * Используется для ограничения pan — viewport не может уехать за пределы данных
   */
  function setDataBounds(timeMin: number, timeMax: number): void {
    dataBoundsRef.current = { timeMin, timeMax };
  }

  /**
   * Получить TimePriceViewport для UI-рендеринга
   */
  function getTimePriceViewport(): TimePriceViewport | null {
    const vp = viewportRef.current;
    const priceRange = priceRangeRef.current;
    
    if (!priceRange) return null;
    
    return {
      timeStart: vp.timeStart,
      timeEnd: vp.timeEnd,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
    };
  }

  return {
    followNow,
    advanceFollowAnimation,
    zoom,
    pan,
    resetFollow,
    setAutoFollow,
    setViewport,
    setWindow,
    getViewport,
    getWindowMs,
    updatePriceRange,
    getTimePriceViewport,
    setDataBounds, // 🔥 FLOW PAN-CLAMP
  };
}
