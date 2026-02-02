/**
 * SentimentBar - полоса распределения CALL/PUT (вертикальная или горизонтальная)
 * 🔥 FLOW S1: Market Sentiment / Traders Distribution Bar
 * 
 * Отдельный canvas, не связанный с основным графиком
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface SentimentBarProps {
  height?: number;
  width?: number;
  orientation?: 'vertical' | 'horizontal';
  onPercentagesChange?: (buy: number, sell: number) => void;
}

export function SentimentBar({ height = 600, width = 12, orientation = 'vertical', onPercentagesChange }: SentimentBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetBuyRef = useRef(0.5);
  const currentBuyRef = useRef(0.5);
  const rafIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const [buyPercentage, setBuyPercentage] = useState(50);
  const [sellPercentage, setSellPercentage] = useState(50);
  const lastBuyPctRef = useRef<number>(50);
  const [actualWidth, setActualWidth] = useState(orientation === 'horizontal' ? 400 : width);
  const [actualHeight, setActualHeight] = useState(orientation === 'horizontal' ? 12 : height);

  // Функция для ограничения значения
  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };

  // Функция для генерации случайного числа в диапазоне
  const random = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Функция отрисовки
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();

    const now = Date.now();

    if (now - lastUpdateRef.current > 1500) {
      targetBuyRef.current = clamp(
        targetBuyRef.current + random(-0.08, 0.08),
        0.15,
        0.85
      );
      lastUpdateRef.current = now;
    }

    currentBuyRef.current += (targetBuyRef.current - currentBuyRef.current) * 0.05;

    const buyRatio = currentBuyRef.current;
    const sellRatio = 1 - buyRatio;

    const newBuyPct = Math.round(buyRatio * 100);
    const newSellPct = Math.round(sellRatio * 100);
    if (Math.abs(newBuyPct - lastBuyPctRef.current) >= 1) {
      setBuyPercentage(newBuyPct);
      setSellPercentage(newSellPct);
      lastBuyPctRef.current = newBuyPct;
      if (onPercentagesChange) {
        onPercentagesChange(newBuyPct, newSellPct);
      }
    }

    const borderRadius = 4;
    const padding = 1;

    if (orientation === 'horizontal') {
      const w = actualWidth;
      const h = actualHeight;
      const buyWidth = w * buyRatio;
      const sellWidth = w - buyWidth;
      const innerHeight = h - padding * 2;
      const innerY = padding;

      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, borderRadius);
      ctx.clip();

      // BUY (зелёный) — слева
      ctx.fillStyle = '#45b833';
      ctx.fillRect(0, innerY, buyWidth, innerHeight);

      // SELL (красный) — справа
      ctx.fillStyle = '#ff3d1f';
      ctx.fillRect(buyWidth, innerY, sellWidth, innerHeight);

      ctx.restore();
      ctx.save();

      // Разделитель — вертикальный ромб (только если есть оба сегмента)
      const diamondWidth = 4;
      const dividerX = Math.max(diamondWidth, Math.min(w - diamondWidth, buyWidth));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(dividerX, 0);
      ctx.lineTo(dividerX + diamondWidth, h / 2);
      ctx.lineTo(dividerX, h);
      ctx.lineTo(dividerX - diamondWidth, h / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      const buyHeight = actualHeight * buyRatio;
      const sellHeight = actualHeight - buyHeight;
      const innerWidth = width - padding * 2;
      const innerX = padding;

      ctx.clearRect(0, 0, width, actualHeight);

      ctx.beginPath();
      ctx.roundRect(0, 0, width, actualHeight, borderRadius);
      ctx.clip();

      ctx.fillStyle = '#ff3d1f';
      ctx.fillRect(innerX, actualHeight - sellHeight, innerWidth, sellHeight);

      ctx.fillStyle = '#45b833';
      ctx.fillRect(innerX, 0, innerWidth, buyHeight);

      ctx.restore();
      ctx.save();

      const dividerY = buyHeight;
      const diamondHeight = 4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(innerX, dividerY);
      ctx.lineTo(width / 2, dividerY - diamondHeight);
      ctx.lineTo(innerX + innerWidth, dividerY);
      ctx.lineTo(width / 2, dividerY + diamondHeight);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (orientation === 'horizontal') {
        if (w > 0) setActualWidth(w);
        if (h > 0) setActualHeight(h);
      } else {
        if (h > 0) setActualHeight(h);
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [orientation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (orientation === 'vertical' && actualHeight === 0) return;
    if (orientation === 'horizontal' && (actualWidth === 0 || actualHeight === 0)) return;

    const dpr = window.devicePixelRatio || 1;
    const w = orientation === 'horizontal' ? actualWidth : width;
    const h = orientation === 'horizontal' ? actualHeight : actualHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const animate = () => {
      render();
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [actualHeight, actualWidth, width, orientation]);

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        width: isHorizontal ? '100%' : `${width}px`,
        height: isHorizontal ? '12px' : '100%',
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
