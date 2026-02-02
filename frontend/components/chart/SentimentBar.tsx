/**
 * SentimentBar - вертикальная полоса распределения CALL/PUT
 * 🔥 FLOW S1: Market Sentiment / Traders Distribution Bar
 * 
 * Отдельный canvas, не связанный с основным графиком
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface SentimentBarProps {
  height: number;
  width?: number;
  onPercentagesChange?: (buy: number, sell: number) => void;
}

export function SentimentBar({ height, width = 12, onPercentagesChange }: SentimentBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetBuyRef = useRef(0.5);
  const currentBuyRef = useRef(0.5);
  const rafIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const [buyPercentage, setBuyPercentage] = useState(50);
  const [sellPercentage, setSellPercentage] = useState(50);
  const lastBuyPctRef = useRef<number>(50);
  const [actualHeight, setActualHeight] = useState(height);

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

    ctx.save(); // Сохраняем состояние для clip

    const now = Date.now();

    // 🔥 FLOW S1.2: Обновляем target каждые 1-2 секунды
    if (now - lastUpdateRef.current > 1500) {
      targetBuyRef.current = clamp(
        targetBuyRef.current + random(-0.08, 0.08),
        0.15,
        0.85
      );
      lastUpdateRef.current = now;
    }

    // 🔥 FLOW S1.3: Плавная анимация к target
    currentBuyRef.current += (targetBuyRef.current - currentBuyRef.current) * 0.05;

    const buyRatio = currentBuyRef.current;
    const sellRatio = 1 - buyRatio;

    // Обновляем проценты для отображения (только при значительном изменении, чтобы не перегружать React)
    const newBuyPct = Math.round(buyRatio * 100);
    const newSellPct = Math.round(sellRatio * 100);
    if (Math.abs(newBuyPct - lastBuyPctRef.current) >= 1) {
      setBuyPercentage(newBuyPct);
      setSellPercentage(newSellPct);
      lastBuyPctRef.current = newBuyPct;
      // Передаем проценты наружу
      if (onPercentagesChange) {
        onPercentagesChange(newBuyPct, newSellPct);
      }
    }

    const buyHeight = actualHeight * buyRatio;
    const sellHeight = actualHeight - buyHeight;
    const borderRadius = 4; // Скругление углов
    const padding = 1; // Минимальный паддинг внутри блока

    // Очищаем canvas
    ctx.clearRect(0, 0, width, actualHeight);

    // Рисуем общий контейнер со скруглениями сверху и снизу
    ctx.beginPath();
    ctx.roundRect(0, 0, width, actualHeight, borderRadius);
    ctx.clip(); // Обрезаем все что выходит за скругленные границы

    // Вычисляем размеры с учетом паддинга
    const innerWidth = width - padding * 2;
    const innerX = padding;

    // 🔥 FLOW S1.4: Рисуем SELL (красный, снизу) - цвет как у красных свечей
    ctx.fillStyle = '#ff3d1f';
    ctx.fillRect(innerX, actualHeight - sellHeight, innerWidth, sellHeight);

    // Рисуем BUY (зелёный, сверху) - цвет как у зеленых свечей
    ctx.fillStyle = '#45b833';
    ctx.fillRect(innerX, 0, innerWidth, buyHeight);

    // Сбрасываем clip
    ctx.restore();
    ctx.save(); // Сохраняем состояние для разделителя

    // Красивый разделитель на стыке двух цветов - ромб с заостренными краями
    const dividerY = buyHeight;
    const diamondHeight = 4; // Высота ромба (вертикальный размер)
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Белый цвет с небольшой прозрачностью
    ctx.beginPath();
    // Рисуем ромб, который полностью закрывает стык по ширине (с учетом паддинга)
    // Левая заостренная точка, центр вверху, правая заостренная точка, центр внизу
    ctx.moveTo(innerX, dividerY); // Левая точка на стыке
    ctx.lineTo(width / 2, dividerY - diamondHeight); // Верхняя центральная точка
    ctx.lineTo(innerX + innerWidth, dividerY); // Правая точка на стыке
    ctx.lineTo(width / 2, dividerY + diamondHeight); // Нижняя центральная точка
    ctx.closePath();
    ctx.fill();
    
    ctx.restore(); // Восстанавливаем состояние
  };

  // Отслеживаем высоту контейнера
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      const containerHeight = container.clientHeight;
      if (containerHeight > 0) {
        setActualHeight(containerHeight);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || actualHeight === 0) return;

    // Устанавливаем размеры canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = actualHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${actualHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // 🔥 FLOW S1.6: Свой render loop
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
  }, [actualHeight, width, buyPercentage, sellPercentage]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      style={{
        width: `${width}px`,
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
