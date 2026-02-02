# 🎯 CHART CORE ARCHITECTURE — Ядро графика

## 📋 Содержание

1. [Viewport — Видимая область графика](#viewport)
2. [Pan — Панорамирование](#pan)
3. [Zoom — Масштабирование](#zoom)
4. [Render Loop — Цикл отрисовки](#render-loop)
5. [Follow Mode — Автоматическое следование](#follow-mode)
6. [Y-Scale Drag — Масштабирование по оси Y](#y-scale-drag)
7. [Взаимодействие компонентов](#взаимодействие-компонентов)
8. [Математические функции](#математические-функции)

---

## Viewport — Видимая область графика

### Определение

**Viewport** — это видимая область графика, определяющая:
- **Временной диапазон** (timeStart, timeEnd) — какие свечи/тики видны
- **Ценовой диапазон** (priceMin, priceMax) — какой диапазон цен виден по оси Y
- **Режим Y** (yMode) — автоматический или ручной масштаб по Y

### Структура данных

```typescript
type Viewport = {
  timeStart: number;      // Начало временного окна (timestamp в мс)
  timeEnd: number;        // Конец временного окна (timestamp в мс)
  priceMin: number;       // Минимальная видимая цена
  priceMax: number;       // Максимальная видимая цена
  yMode: 'auto' | 'manual'; // Режим масштабирования по Y
};
```

### Конфигурация

```typescript
type ViewportConfig = {
  visibleCandles: number;    // Количество видимых свечей (например, 60)
  yPaddingRatio: number;    // Отступ по Y (например, 0.1 = 10%)
  rightPaddingRatio: number; // Отступ справа для follow mode (например, 0.35 = 35%)
};
```

### Вычисление visibleCandles

**Формула:**
```
baseVisible = canvasWidth / TARGET_CANDLE_PX
timeframeMultiplier = timeframeMs / BASE_TIMEFRAME_MS
visibleCandles = baseVisible * timeframeMultiplier
```

**Константы:**
- `TARGET_CANDLE_PX = 14` — целевая ширина свечи в пикселях
- `BASE_TIMEFRAME_MS = 5000` — базовый таймфрейм (5 секунд)
- `MIN_VISIBLE_CANDLES = 20` — минимум свечей на экране
- `MAX_VISIBLE_CANDLES = 300` — максимум свечей на экране

**Логика:**
- Большие таймфреймы автоматически "отодвигают" viewport назад
- 5s: multiplier = 1 → видим базовое количество
- 30s: multiplier = 6 → видим в 6 раз больше
- 1m: multiplier = 12 → видим в 12 раз больше

### Auto-fit по Y

**Принцип:**
- При `yMode === 'auto'` — автоматически вычисляется `priceMin` и `priceMax` на основе видимых свечей
- При `yMode === 'manual'` — значения `priceMin` и `priceMax` сохраняются вручную

**Формула:**
```typescript
// Находим min(low) и max(high) среди видимых свечей
priceMin = Math.min(...visibleCandles.map(c => c.low))
priceMax = Math.max(...visibleCandles.map(c => c.high))

// Добавляем padding
range = priceMax - priceMin
padding = range * yPaddingRatio
priceMin = priceMin - padding
priceMax = priceMax + padding
```

### API useViewport

**Основные методы:**

```typescript
// Получить текущий viewport
getViewport(): Viewport | null

// Пересчитать viewport на основе данных
recalculateViewport(): void

// Пересчитать только Y (без изменения X)
recalculateYOnly(): void

// Обновить viewport (для pan/zoom)
updateViewport(newViewport: Viewport): void

// Follow mode API
setFollowMode(on: boolean): void
getFollowMode(): boolean
toggleFollowMode(): void
followLatest(): void
shouldShowReturnToLatest(): boolean
advanceFollowAnimation(now: number): void

// Y-scale drag API
beginYScaleDrag(startY: number): void
updateYScaleDrag(currentY: number): void
endYScaleDrag(): void
resetYScale(): void

// Полный сброс viewport
reset(): void
```

---

## Pan — Панорамирование

### Определение

**Pan** — это перемещение viewport влево/вправо по временной оси без изменения масштаба.

### Как работает

1. **События:**
   - `mousedown` — начало pan (левая кнопка мыши)
   - `mousemove` — продолжение pan (пока кнопка зажата)
   - `mouseup` — конец pan

2. **Состояние:**
   ```typescript
   type InteractionState = {
     isDragging: boolean;
     lastX: number | null;  // Последняя X координата мыши
   };
   ```

3. **Математика:**
   ```typescript
   // Конвертируем deltaX (пиксели) в миллисекунды
   pixelsPerMs = canvas.clientWidth / (viewport.timeEnd - viewport.timeStart)
   deltaTime = deltaX / pixelsPerMs
   
   // Сдвигаем viewport
   newTimeStart = viewport.timeStart - deltaTime
   newTimeEnd = newTimeStart + timeRange
   ```

### Функция panViewportTime

```typescript
function panViewportTime({
  viewport,
  deltaX,        // Изменение X в пикселях
  pixelsPerMs,   // Пикселей на миллисекунду
}): Viewport {
  const deltaTime = deltaX / pixelsPerMs;
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const newTimeStart = viewport.timeStart - deltaTime;
  const newTimeEnd = newTimeStart + timeRange;
  
  return {
    ...viewport,
    timeStart: newTimeStart,
    timeEnd: newTimeEnd,
  };
}
```

### Важные детали

- **Инвариант:** `timeStart < timeEnd` — всегда должен соблюдаться
- **Follow mode:** При начале pan автоматически выключается follow mode
- **Y пересчет:** После pan Y автоматически пересчитывается через auto-fit (если `yMode === 'auto'`)
- **История:** После pan вызывается `onViewportChange` для загрузки истории (infinite scroll)

### Обработка событий

```typescript
// handleMouseDown
if (e.button !== 0) return; // Только левая кнопка
interactionStateRef.current = {
  isDragging: true,
  lastX: x, // X координата мыши относительно canvas
};

// handleMouseMove
if (!state.isDragging || state.lastX === null) return;
const deltaX = currentX - state.lastX;
const newViewport = panViewportTime({ viewport, deltaX, pixelsPerMs });
updateViewport(newViewport);
onViewportChange?.(newViewport);

// handleMouseUp
interactionStateRef.current = {
  isDragging: false,
  lastX: null,
};
```

---

## Zoom — Масштабирование

### Определение

**Zoom** — это изменение масштаба viewport (увеличение/уменьшение видимой области) относительно точки курсора.

### Как работает

1. **События:**
   - `wheel` — событие колесика мыши
   - `e.deltaY < 0` — скролл вверх = zoom in (увеличение)
   - `e.deltaY > 0` — скролл вниз = zoom out (уменьшение)

2. **Математика:**
   ```typescript
   // Определяем zoom factor
   zoomFactor = e.deltaY < 0 ? 1 - ZOOM_SENSITIVITY : 1 + ZOOM_SENSITIVITY
   // ZOOM_SENSITIVITY = 0.1 (10% за шаг)
   
   // Получаем время в точке курсора (anchor)
   anchorTime = mouseXToTime(e.clientX, canvas, viewport)
   
   // Масштабируем viewport относительно anchor
   newTimeRange = currentTimeRange * zoomFactor
   ```

### Функция zoomViewportTime

```typescript
function zoomViewportTime({
  viewport,
  zoomFactor,        // > 1 = zoom out, < 1 = zoom in
  anchorTime,        // Точка масштабирования (время под курсором)
  minVisibleCandles, // Минимум свечей (20)
  maxVisibleCandles, // Максимум свечей (300)
  timeframeMs,       // Таймфрейм в миллисекундах
}): Viewport {
  const currentTimeRange = viewport.timeEnd - viewport.timeStart;
  const newTimeRange = currentTimeRange * zoomFactor;
  
  // Ограничиваем диапазон
  const minTimeRange = minVisibleCandles * timeframeMs;
  const maxTimeRange = maxVisibleCandles * timeframeMs;
  const clampedTimeRange = Math.max(minTimeRange, Math.min(maxTimeRange, newTimeRange));
  
  // Вычисляем позицию якоря относительно текущего viewport
  const anchorRatio = (anchorTime - viewport.timeStart) / currentTimeRange;
  
  // Вычисляем новый диапазон относительно якоря
  const newTimeStart = anchorTime - clampedTimeRange * anchorRatio;
  const newTimeEnd = newTimeStart + clampedTimeRange;
  
  return {
    ...viewport,
    timeStart: newTimeStart,
    timeEnd: newTimeEnd,
  };
}
```

### Конвертация X → Time

```typescript
function mouseXToTime(
  mouseX: number,
  canvas: HTMLCanvasElement,
  viewport: Viewport
): number {
  const rect = canvas.getBoundingClientRect();
  const relativeX = mouseX - rect.left;
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const pixelsPerMs = canvas.clientWidth / timeRange;
  return viewport.timeStart + relativeX / pixelsPerMs;
}
```

### Важные детали

- **Anchor point:** Zoom происходит относительно точки курсора (не центра экрана)
- **Ограничения:** Минимум 20 свечей, максимум 300 свечей
- **Follow mode:** При zoom автоматически выключается follow mode
- **Y пересчет:** После zoom Y автоматически пересчитывается через auto-fit (если `yMode === 'auto'`)
- **История:** После zoom вызывается `onViewportChange` для загрузки истории

### Обработка событий

```typescript
// handleWheel
e.preventDefault(); // Предотвращаем скролл страницы

const zoomFactor = e.deltaY < 0 ? 1 - ZOOM_SENSITIVITY : 1 + ZOOM_SENSITIVITY;
const anchorTime = mouseXToTime(e.clientX, canvas, viewport);

const newViewport = zoomViewportTime({
  viewport,
  zoomFactor,
  anchorTime,
  minVisibleCandles: MIN_VISIBLE_CANDLES,
  maxVisibleCandles: MAX_VISIBLE_CANDLES,
  timeframeMs,
});

setFollowMode?.(false);
updateViewport(newViewport);
onViewportChange?.(newViewport);
```

---

## Render Loop — Цикл отрисовки

### Определение

**Render Loop** — это цикл отрисовки на `requestAnimationFrame`, который:
- Обновляет анимации каждый кадр
- Рисует все слои графика в правильном порядке
- Обрабатывает follow mode анимацию

### Структура

```typescript
function render(now: number) {
  // 1. Обновление анимаций
  updateAnimator(now);
  
  // 2. Follow mode анимация
  if (getFollowMode()) {
    advanceFollowAnimation(now);
  }
  
  // 3. Получение viewport
  const viewport = getViewport();
  if (!viewport) return;
  
  // 4. Отрисовка слоев (в порядке снизу вверх)
  renderBackground(ctx, width, height);
  renderGrid(ctx, viewport, width, height);
  renderCandles(ctx, viewport, candles);
  renderIndicators(ctx, viewport, indicators);
  renderDrawings(ctx, viewport, drawings);
  renderTrades(ctx, viewport, trades);
  renderHoverHighlight(ctx, viewport, hoverAction);
  renderCrosshair(ctx, viewport, crosshair);
  renderOhlcPanel(ctx, ohlc);
  renderPriceAlerts(ctx, viewport, alerts);
  renderCountdown(ctx, viewport, countdown);
  
  // 5. Следующий кадр
  rafIdRef.current = requestAnimationFrame(render);
}
```

### Порядок отрисовки (снизу вверх)

1. **Background** — фон графика
2. **Grid** — сетка (временная и ценовая)
3. **Candles** — свечи (исторические + live)
4. **Indicators** — индикаторы (MA, RSI и т.д.)
5. **Drawings** — рисунки (линии, фигуры)
6. **Trades** — сделки (overlay)
7. **Hover Highlight** — подсветка при hover на CALL/PUT
8. **Crosshair** — перекрестие курсора
9. **OHLC Panel** — панель OHLC
10. **Price Alerts** — ценовые алерты
11. **Countdown** — таймер экспирации

### Инициализация

```typescript
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Запускаем render loop
  rafIdRef.current = requestAnimationFrame(render);
  
  return () => {
    // Останавливаем при unmount
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
  };
}, []);
```

### Важные детали

- **60 FPS:** `requestAnimationFrame` обеспечивает ~60 кадров в секунду
- **Неблокирующий:** Рендер не блокирует UI поток
- **Условный рендер:** Если viewport === null, ничего не рисуется
- **Очистка:** При unmount цикл останавливается через `cancelAnimationFrame`

---

## Follow Mode — Автоматическое следование

### Определение

**Follow Mode** — это режим, при котором viewport автоматически следует за текущим временем рынка (live свеча).

### Как работает

1. **Состояние:**
   ```typescript
   const followModeRef = useRef<boolean>(true); // По умолчанию включен
   ```

2. **Якорь времени:**
   ```typescript
   const latestCandleTimeRef = useRef<number | null>(null);
   // Обновляется при price:update / candle:close
   ```

3. **Целевой viewport:**
   ```typescript
   const targetViewportRef = useRef<Viewport | null>(null);
   // Целевой viewport для плавной анимации
   ```

4. **Анимация:**
   ```typescript
   const followAnimationStartRef = useRef<{
     viewport: Viewport;
     time: number;
   } | null>(null);
   ```

### Вычисление целевого viewport

```typescript
// При включенном follow mode
const liveCandle = getLiveCandle();
const candleStepMs = timeframeMs;
const totalWindowMs = visibleCandles * candleStepMs;
const rightPaddingMs = totalWindowMs * rightPaddingRatio; // 35%

// Правая граница = endTime live-свечи + padding
const timeEnd = liveCandle.endTime + rightPaddingMs;
const timeStart = timeEnd - totalWindowMs;

// Y пересчитывается через auto-fit
const priceRange = calculatePriceRange(visibleCandles, yPaddingRatio);
```

### Плавная анимация

```typescript
function advanceFollowAnimation(now: number): void {
  const target = targetViewportRef.current;
  const start = followAnimationStartRef.current;
  if (!target || !start) return;
  
  // Первый кадр — фиксируем время старта
  const startTime = start.time === 0 ? now : start.time;
  if (start.time === 0) {
    followAnimationStartRef.current = { viewport: start.viewport, time: now };
  }
  
  const elapsed = now - startTime;
  const progress = Math.min(1, elapsed / FOLLOW_SHIFT_DURATION_MS); // 320ms
  const t = easeOutCubic(progress); // Easing функция
  
  const from = followAnimationStartRef.current.viewport;
  viewportRef.current = {
    timeStart: lerp(from.timeStart, target.timeStart, t),
    timeEnd: lerp(from.timeEnd, target.timeEnd, t),
    priceMin: lerp(from.priceMin, target.priceMin, t),
    priceMax: lerp(from.priceMax, target.priceMax, t),
    yMode: target.yMode,
  };
  
  if (progress >= 1) {
    viewportRef.current = { ...target };
    targetViewportRef.current = null;
    followAnimationStartRef.current = null;
  }
}
```

### Easing функция

```typescript
const FOLLOW_SHIFT_DURATION_MS = 320; // Длительность анимации

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
```

### Когда выключается

- При начале pan (drag)
- При zoom (колесико мыши)
- При ручном выключении через `setFollowMode(false)`

### Когда включается

- При нажатии кнопки "Вернуться к текущим" (`followLatest()`)
- При ручном включении через `setFollowMode(true)`

---

## Y-Scale Drag — Масштабирование по оси Y

### Определение

**Y-Scale Drag** — это перетаскивание правой оси цены для ручного изменения масштаба по Y.

### Как работает

1. **Определение зоны:**
   ```typescript
   const PRICE_AXIS_WIDTH = 80; // Ширина правой оси цены
   
   function isMouseOnPriceAxis(mouseX: number, canvas: HTMLCanvasElement): boolean {
     const rect = canvas.getBoundingClientRect();
     const relativeX = mouseX - rect.left;
     return relativeX > canvas.clientWidth - PRICE_AXIS_WIDTH;
   }
   ```

2. **Начало drag:**
   ```typescript
   if (isMouseOnPriceAxis(e.clientX, canvas)) {
     yDragStateRef.current = true;
     beginYScaleDrag(y); // Y координата мыши
   }
   ```

3. **Обновление:**
   ```typescript
   function updateYScaleDrag(currentY: number): void {
     const dy = currentY - startY;
     const scaleFactor = 1 + dy * 0.005; // Чувствительность
     
     // Ограничения
     const minRange = startRange * 0.01;  // Не уже 1%
     const maxRange = startRange * 100;   // Не шире 100x
     
     const newRange = Math.max(minRange, Math.min(maxRange, startRange * scaleFactor));
     
     // Центр масштабирования — середина диапазона
     const mid = (priceMin + priceMax) / 2;
     const newPriceMin = mid - newRange / 2;
     const newPriceMax = mid + newRange / 2;
     
     viewportRef.current = {
       ...viewport,
       priceMin: newPriceMin,
       priceMax: newPriceMax,
       yMode: 'manual', // Переключаем в ручной режим
     };
   }
   ```

4. **Завершение:**
   ```typescript
   function endYScaleDrag(): void {
     yDragRef.current = null;
   }
   ```

### Важные детали

- **Режим:** При начале drag автоматически переключается в `yMode: 'manual'`
- **Чувствительность:** `dy * 0.005` — можно настроить
- **Ограничения:** От 1% до 100x от начального диапазона
- **Центр:** Масштабирование происходит относительно центра диапазона
- **Курсор:** При наведении на ось Y курсор меняется на `ns-resize`

### Сброс Y-scale

```typescript
function resetYScale(): void {
  viewportRef.current = {
    ...viewport,
    yMode: 'auto', // Переключаем обратно в auto
  };
  recalculateYOnly(); // Пересчитываем Y через auto-fit
}
```

---

## Взаимодействие компонентов

### Архитектура

```
useChart (оркестратор)
├── useViewport (viewport управление)
│   ├── recalculateViewport()
│   ├── updateViewport()
│   ├── advanceFollowAnimation()
│   └── Y-scale drag методы
├── useChartInteractions (pan/zoom)
│   ├── handleMouseDown/Move/Up (pan)
│   ├── handleWheel (zoom)
│   └── Y-scale drag обработка
├── useRenderLoop (отрисовка)
│   └── render() на requestAnimationFrame
└── useChartData (данные)
    ├── getCandles()
    └── getLiveCandle()
```

### Поток данных

1. **Пользователь взаимодействует:**
   - Pan: `mousedown` → `mousemove` → `mouseup`
   - Zoom: `wheel`
   - Y-scale drag: `mousedown` на оси Y → `mousemove` → `mouseup`

2. **useChartInteractions обрабатывает:**
   - Вызывает `panViewportTime()` или `zoomViewportTime()`
   - Вызывает `updateViewport(newViewport)`
   - Вызывает `onViewportChange(newViewport)` для загрузки истории

3. **useViewport обновляет:**
   - Обновляет `viewportRef.current`
   - Пересчитывает Y через auto-fit (если `yMode === 'auto'`)
   - Выключает follow mode (при pan/zoom)

4. **useRenderLoop рисует:**
   - Получает viewport через `getViewport()`
   - Рисует все слои в правильном порядке
   - Обновляет follow animation каждый кадр

### Важные инварианты

1. **Viewport всегда валиден:**
   - `timeStart < timeEnd`
   - `priceMin < priceMax`

2. **Follow mode и pan/zoom взаимоисключающие:**
   - При pan/zoom follow mode выключается
   - При включении follow mode pan/zoom останавливается

3. **Y пересчет:**
   - При `yMode === 'auto'` Y всегда пересчитывается через auto-fit
   - При `yMode === 'manual'` Y сохраняется вручную

4. **Render loop:**
   - Всегда рисует актуальный viewport
   - Не мутирует данные, только читает

---

## Математические функции

### panViewportTime

```typescript
function panViewportTime({
  viewport,
  deltaX,        // Изменение X в пикселях
  pixelsPerMs,   // Пикселей на миллисекунду
}): Viewport {
  const deltaTime = deltaX / pixelsPerMs;
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const newTimeStart = viewport.timeStart - deltaTime;
  const newTimeEnd = newTimeStart + timeRange;
  
  return {
    ...viewport,
    timeStart: newTimeStart,
    timeEnd: newTimeEnd,
  };
}
```

### zoomViewportTime

```typescript
function zoomViewportTime({
  viewport,
  zoomFactor,        // > 1 = zoom out, < 1 = zoom in
  anchorTime,        // Точка масштабирования
  minVisibleCandles, // 20
  maxVisibleCandles, // 300
  timeframeMs,       // Таймфрейм в мс
}): Viewport {
  const currentTimeRange = viewport.timeEnd - viewport.timeStart;
  const newTimeRange = currentTimeRange * zoomFactor;
  
  // Ограничения
  const minTimeRange = minVisibleCandles * timeframeMs;
  const maxTimeRange = maxVisibleCandles * timeframeMs;
  const clampedTimeRange = Math.max(minTimeRange, Math.min(maxTimeRange, newTimeRange));
  
  // Позиция якоря относительно viewport
  const anchorRatio = (anchorTime - viewport.timeStart) / currentTimeRange;
  
  // Новый диапазон относительно якоря
  const newTimeStart = anchorTime - clampedTimeRange * anchorRatio;
  const newTimeEnd = newTimeStart + clampedTimeRange;
  
  return {
    ...viewport,
    timeStart: newTimeStart,
    timeEnd: newTimeEnd,
  };
}
```

### mouseXToTime

```typescript
function mouseXToTime(
  mouseX: number,
  canvas: HTMLCanvasElement,
  viewport: Viewport
): number {
  const rect = canvas.getBoundingClientRect();
  const relativeX = mouseX - rect.left;
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const pixelsPerMs = canvas.clientWidth / timeRange;
  return viewport.timeStart + relativeX / pixelsPerMs;
}
```

### calculatePriceRange

```typescript
function calculatePriceRange(
  visibleCandles: Candle[],
  yPaddingRatio: number
): { priceMin: number; priceMax: number } | null {
  if (visibleCandles.length === 0) return null;
  
  let priceMin = Infinity;
  let priceMax = -Infinity;
  
  for (const candle of visibleCandles) {
    priceMin = Math.min(priceMin, candle.low);
    priceMax = Math.max(priceMax, candle.high);
  }
  
  if (priceMin >= priceMax) {
    const center = priceMin;
    priceMin = center - 1;
    priceMax = center + 1;
  }
  
  const range = priceMax - priceMin;
  const padding = range * yPaddingRatio;
  
  return {
    priceMin: priceMin - padding,
    priceMax: priceMax + padding,
  };
}
```

---

## 📝 Примечания для добавления инерции

### Текущая реализация Pan

Сейчас pan работает мгновенно — каждое движение мыши сразу обновляет viewport. Для добавления инерции нужно:

1. **Сохранять скорость:**
   ```typescript
   const panVelocityRef = useRef<number>(0); // Скорость в пикселях/мс
   ```

2. **Вычислять скорость при mouseMove:**
   ```typescript
   const deltaX = currentX - lastX;
   const deltaTime = now - lastMoveTime;
   panVelocityRef.current = deltaX / deltaTime; // Скорость
   ```

3. **Применять инерцию при mouseUp:**
   ```typescript
   // Запускаем анимацию инерции
   function applyPanInertia() {
     const velocity = panVelocityRef.current;
     if (Math.abs(velocity) < 0.1) return; // Останавливаем если слишком медленно
     
     const friction = 0.95; // Коэффициент трения
     panVelocityRef.current *= friction;
     
     const deltaX = velocity * frameTime;
     const newViewport = panViewportTime({ viewport, deltaX, pixelsPerMs });
     updateViewport(newViewport);
     
     requestAnimationFrame(applyPanInertia);
   }
   ```

### Где добавить инерцию

- **useChartInteractions.ts:** В `handleMouseUp` запускать анимацию инерции
- **useViewport.ts:** Можно добавить метод `applyPanInertia()` или сделать отдельный хук
- **Render loop:** Интегрировать в `useRenderLoop` для плавной анимации

### Важные моменты

- **Остановка:** Инерция должна останавливаться при достижении границ данных или при новом взаимодействии
- **Follow mode:** При включении follow mode инерция должна прерываться
- **Производительность:** Использовать `requestAnimationFrame` для плавной анимации

---

## 🎯 Итоговая схема

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERACTION                      │
│  (Pan, Zoom, Y-Scale Drag, Follow Mode Toggle)          │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              useChartInteractions                        │
│  • handleMouseDown/Move/Up (Pan)                        │
│  • handleWheel (Zoom)                                   │
│  • Y-Scale Drag Detection                               │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              MATH FUNCTIONS                              │
│  • panViewportTime()                                     │
│  • zoomViewportTime()                                    │
│  • mouseXToTime()                                        │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              useViewport                                │
│  • updateViewport()                                      │
│  • recalculateYOnly() (auto-fit)                        │
│  • advanceFollowAnimation()                              │
│  • Y-Scale Drag Methods                                  │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              useRenderLoop                               │
│  • requestAnimationFrame                                 │
│  • render() - отрисовка всех слоев                       │
│  • advanceFollowAnimation() каждый кадр                 │
└─────────────────────────────────────────────────────────┘
```

---

**Версия:** 1.0  
**Дата:** 2026-01-30  
**Автор:** Chart Core Architecture Documentation
