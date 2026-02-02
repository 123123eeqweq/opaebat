# Архитектура линейного графика — полное описание

Документ описывает архитектуру, реализацию и анимацию линейного графика (line chart) на тиках. Линейный график работает с price points (time, price), а не со свечами.

---

## 📋 Содержание

1. [Общая архитектура](#общая-архитектура)
2. [Компоненты и их ответственность](#компоненты-и-их-ответственность)
3. [Поток данных (WebSocket → рендер)](#поток-данных-websocket--рендер)
4. [Анимация live-сегмента](#анимация-live-сегмента)
5. [Viewport и навигация](#viewport-и-навигация)
6. [Рендеринг](#рендеринг)
7. [Индикаторы](#индикаторы)
8. [Взаимодействия (pan, zoom, inertia)](#взаимодействия-pan-zoom-inertia)

---

## 🏗️ Общая архитектура

Линейный график построен по принципу разделения ответственности:

```
┌─────────────────────────────────────────────────────────────┐
│                    LineChart.tsx                              │
│  (React компонент, интеграция с WebSocket, обработка событий)│
└───────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    useLineChart.ts                           │
│  (Главный оркестратор: объединяет все хуки и рендер-луп)    │
└───────┬───────────┬───────────┬───────────┬─────────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│PointStore│ │ Viewport │ │LineData  │ │Animator  │
│          │ │          │ │          │ │          │
│История   │ │Временное │ │WebSocket │ │Анимация  │
│точек     │ │окно      │ │интеграция│ │цены      │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Ключевые принципы:**

1. **История immutable** — точки истории никогда не мутируются, только добавляются/удаляются
2. **Live сегмент ephemeral** — существует отдельно от истории, не сохраняется
3. **Анимация в отдельном слое** — `useLinePriceAnimator` отвечает только за плавное движение цены
4. **Viewport как временное окно** — не индексы, а реальные временные метки
5. **Render loop на RAF** — 60 FPS, обновление каждый кадр

---

## 🧩 Компоненты и их ответственность

### 1. `useLinePointStore.ts` — хранилище точек

**Ответственность:**
- Хранение price points `{ time: number, price: number }`
- Ограничение размера (MAX_POINTS = 3000)
- Операции: `push`, `appendMany`, `prepend`, `getAll`, `getLast`, `reset`

**Особенности:**
- Одна точка в секунду (не каждый тик!)
- При превышении лимита удаляются старые точки слева
- `prepend` используется для infinite scroll (загрузка истории влево)

**Пример:**
```typescript
const pointStore = useLinePointStore();
pointStore.push({ time: 1000, price: 1.2345 }); // Добавить точку
const last = pointStore.getLast(); // Последняя точка
```

---

### 2. `useLineViewport.ts` — временное окно

**Ответственность:**
- Управление видимым временным диапазоном `{ timeStart, timeEnd, autoFollow }`
- Zoom (изменение ширины окна)
- Pan (сдвиг окна влево/вправо)
- Auto-follow (автоматическое следование за текущим временем)

**Ключевая идея:**
Viewport — это **временное окно**, а не индексы массивов. Все операции работают с реальными timestamp'ами.

**Методы:**
- `zoom(factor)` — factor > 1 = увеличить масштаб (меньше времени видно)
- `pan(deltaMs)` — сдвинуть окно на deltaMs миллисекунд
- `followNow(now)` — обновить окно до текущего времени (если autoFollow включен)
- `setAutoFollow(enabled)` — включить/выключить автоматическое следование

**Пример:**
```typescript
const viewport = useLineViewport();
viewport.setWindow(now - 60000, now); // Окно 60 секунд
viewport.zoom(1.5); // Увеличить масштаб в 1.5 раза
viewport.pan(-10000); // Сдвинуть на 10 секунд влево (в прошлое)
```

---

### 3. `useLineData.ts` — WebSocket интеграция

**Ответственность:**
- Обработка тиков из WebSocket (`onPriceUpdate`)
- Разделение: история (раз в секунду) vs live сегмент (каждый тик)
- Обновление viewport (auto-follow)

**Ключевое разделение:**

```
WebSocket тик (каждые ~100-500ms)
    │
    ├─→ Live сегмент (ephemeral, обновляется каждый тик)
    │   └─→ { fromTime, toTime, fromPrice }
    │       Используется для отрисовки "живой" части линии
    │
    └─→ История (immutable, записывается раз в секунду)
        └─→ pointStore.push({ time: second, price })
            Когда секунда закрылась, live сегмент превращается в точку истории
```

**Алгоритм `onPriceUpdate`:**

1. Получаем последнюю точку истории
2. Создаём/обновляем live сегмент: `{ fromTime: lastPoint.time, toTime: now, fromPrice: lastPoint.price }`
3. Проверяем, изменилась ли секунда:
   - Если да → записываем точку в историю (`pointStore.push`)
   - Сбрасываем live сегмент (`setLiveSegment(null)`)
   - Обновляем viewport (`viewport.followNow(second)`)

**Важно:**
- Live сегмент **НЕ содержит** `animatedPrice` — это было архитектурной ошибкой
- `animatedPrice` берётся из `useLinePriceAnimator` в render loop
- Live сегмент обновляется только при тиках, не каждый кадр

---

### 4. `useLinePriceAnimator.ts` — анимация цены

**Ответственность:**
- Плавное движение цены от текущего значения к новому (lerp + easeOutCubic, 350ms)
- Только presentation layer — не мутирует данные

**Почему отдельный аниматор:**

1. **Не ломаем useLineData** — логика записи истории остаётся чистой
2. **Не перезаписываем ref каждый кадр** — `liveSegment` обновляется только при тиках
3. **60 FPS** — анимация обновляется каждый кадр в render loop
4. **Паттерн как в свечах** — совпадает с `useCandleAnimator`

**API:**

```typescript
const priceAnimator = useLinePriceAnimator();

// При тике из WebSocket
priceAnimator.onPriceUpdate(newPrice);

// В render loop (каждый кадр)
priceAnimator.update(now);
const animatedPrice = priceAnimator.getAnimatedPrice();

// При первом появлении live-сегмента (seed от fromPrice)
priceAnimator.seedFrom(fromPrice);

// При reset
priceAnimator.reset();
```

**Внутренняя реализация:**

```typescript
// Состояние анимации
const valueRef = useRef<number>(0); // Текущее анимированное значение
const animationRef = useRef<{
  from: number;
  to: number;
  startTime: number;
  duration: 350; // ms
  active: boolean;
}>({ ... });

// onPriceUpdate: запускает анимацию от текущего значения к новому
onPriceUpdate(price) {
  animationRef.current = {
    from: valueRef.current, // Текущее значение
    to: price,              // Цель
    startTime: performance.now(),
    active: true,
  };
}

// update: обновляет анимацию каждый кадр
update(now) {
  const progress = clamp((now - startTime) / duration, 0, 1);
  const eased = easeOutCubic(progress); // 1 - (1-t)³
  valueRef.current = lerp(from, to, eased);
  
  if (progress >= 1) {
    active = false; // Анимация завершена
  }
}
```

**Easing функция (easeOutCubic):**
```
t → 1 - (1-t)³
```
- Быстрый старт, плавное замедление к концу
- Стандартная функция для UI-анимаций

---

### 5. `useLineChart.ts` — главный оркестратор

**Ответственность:**
- Объединение всех компонентов
- Render loop на requestAnimationFrame
- Обработка событий (zoom, pan, reset)
- Интеграция с индикаторами, drawings, crosshair, trades

**Структура:**

```typescript
export function useLineChart({ canvasRef, ... }) {
  // 1. Хранилища и хуки
  const pointStore = useLinePointStore();
  const viewport = useLineViewport();
  const lineData = useLineData({ pointStore, viewport, setLiveSegment });
  const priceAnimator = useLinePriceAnimator();
  
  // 2. Live сегмент (ref, не state)
  const liveSegmentRef = useRef<LiveSegment>(null);
  const hadLiveSegmentRef = useRef<boolean>(false); // Для seed аниматора
  
  // 3. Render loop
  useEffect(() => {
    function render(now: number) {
      // Обновляем аниматор
      if (liveSegmentRef.current) {
        priceAnimator.update(now);
      }
      const animatedPrice = liveSegmentRef.current 
        ? priceAnimator.getAnimatedPrice() 
        : undefined;
      
      // Рендерим всё
      renderBackground(...);
      renderGrid(...);
      renderLine(...); // История
      if (liveSegment && animatedPrice) {
        renderLiveSegment({ ..., toPrice: animatedPrice }); // Live сегмент
      }
      renderPulsatingPoint(...);
      // ... остальное
    }
    
    render(performance.now());
    requestAnimationFrame(render);
  }, [dependencies]);
  
  // 4. handlePriceUpdate
  const handlePriceUpdate = (price, timestamp) => {
    lineData.onPriceUpdate(price, timestamp); // Обновляет liveSegment
    
    const seg = liveSegmentRef.current;
    if (seg) {
      if (!hadLiveSegmentRef.current) {
        // Первый тик после появления сегмента — seed от fromPrice
        priceAnimator.seedFrom(seg.fromPrice);
        hadLiveSegmentRef.current = true;
      }
      priceAnimator.onPriceUpdate(price); // Запускает анимацию
    } else {
      hadLiveSegmentRef.current = false;
    }
  };
}
```

**Ключевые моменты:**

1. **Live сегмент в ref** — не перезаписывается каждый кадр, только при тиках
2. **Аниматор обновляется в render loop** — `priceAnimator.update(now)` каждый кадр
3. **Seed при первом появлении** — `seedFrom(fromPrice)` предотвращает скачок
4. **toPrice из аниматора** — `renderLiveSegment` получает `toPrice: animatedPrice`, не из liveSegment

---

## 🔄 Поток данных (WebSocket → рендер)

### Шаг 1: WebSocket тик

```
WebSocket → useWebSocket → LineChart.handlePriceUpdate
```

### Шаг 2: Обработка тика

```typescript
handlePriceUpdate(price, timestamp) {
  // 2.1: Обновляем данные (useLineData)
  lineData.onPriceUpdate(price, timestamp);
  // → Создаёт/обновляет liveSegment: { fromTime, toTime, fromPrice }
  // → Если секунда изменилась: записывает точку в историю, сбрасывает liveSegment
  
  // 2.2: Обновляем аниматор
  const seg = liveSegmentRef.current;
  if (seg) {
    if (!hadLiveSegmentRef.current) {
      priceAnimator.seedFrom(seg.fromPrice); // Первый тик — seed
      hadLiveSegmentRef.current = true;
    }
    priceAnimator.onPriceUpdate(price); // Запускает анимацию
  }
}
```

### Шаг 3: Render loop (каждый кадр, ~60 FPS)

```typescript
function render(now: number) {
  // 3.1: Обновляем аниматор
  if (liveSegmentRef.current) {
    priceAnimator.update(now); // Прогресс анимации
  }
  const animatedPrice = liveSegmentRef.current
    ? priceAnimator.getAnimatedPrice() // Текущее анимированное значение
    : undefined;
  
  // 3.2: Вычисляем price range (с учётом animatedPrice)
  const priceRange = calculatePriceRange(
    historyPoints,
    viewport,
    liveSegmentRef.current,
    animatedPrice // ← Анимированная цена для диапазона
  );
  
  // 3.3: Рендерим
  renderLine(...); // История (immutable)
  
  if (liveSegmentRef.current && animatedPrice !== undefined) {
    renderLiveSegment({
      liveSegment: liveSegmentRef.current, // fromTime, toTime, fromPrice
      toPrice: animatedPrice,              // ← Из аниматора!
      ...
    });
  }
  
  renderPulsatingPoint({ price: animatedPrice ?? lastPoint.price });
}
```

### Визуализация потока:

```
WebSocket тик (каждые ~100-500ms)
    │
    ├─→ useLineData.onPriceUpdate
    │   ├─→ Обновляет liveSegmentRef (только при тике!)
    │   └─→ Записывает точку в историю (раз в секунду)
    │
    └─→ priceAnimator.onPriceUpdate(price)
        └─→ Запускает анимацию: from → to
        
Render loop (каждый кадр, ~60 FPS)
    │
    ├─→ priceAnimator.update(now)
    │   └─→ Обновляет valueRef.current (lerp + ease)
    │
    ├─→ priceAnimator.getAnimatedPrice()
    │   └─→ Возвращает valueRef.current
    │
    └─→ renderLiveSegment({ toPrice: animatedPrice })
        └─→ Рисует линию от fromPrice к animatedPrice
```

---

## 🎨 Анимация live-сегмента

### Проблема (до исправления):

**Архитектурная ошибка:**
- `LiveSegment` содержал `animatedPrice: price` (сырая цена тика)
- При каждом тике `animatedPrice` менялся → конец линии прыгал
- Не было плавной анимации

**Код (неправильно):**
```typescript
// useLineData.ts
const liveSegment: LiveSegment = {
  fromTime: lastPoint.time,
  toTime: now,
  fromPrice: lastPoint.price,
  animatedPrice: price, // ← Сырая цена, без анимации!
};
setLiveSegment(liveSegment); // ← Перезаписывается каждый тик
```

### Решение:

**1. Убрали `animatedPrice` из `LiveSegment`:**
```typescript
export type LiveSegment = {
  fromTime: number;
  toTime: number;
  fromPrice: number;
  // animatedPrice удалён!
} | null;
```

**2. Создали отдельный аниматор:**
```typescript
const priceAnimator = useLinePriceAnimator();
```

**3. В render loop берём цену из аниматора:**
```typescript
// Каждый кадр
priceAnimator.update(now);
const animatedPrice = priceAnimator.getAnimatedPrice();

// Рендерим с анимированной ценой
renderLiveSegment({
  liveSegment,        // fromTime, toTime, fromPrice
  toPrice: animatedPrice, // ← Из аниматора!
  ...
});
```

**4. Seed при первом появлении сегмента:**
```typescript
if (!hadLiveSegmentRef.current) {
  priceAnimator.seedFrom(seg.fromPrice); // Якорь от fromPrice
  hadLiveSegmentRef.current = true;
}
```

### Результат:

✅ **Плавная анимация** — конец линии плавно движется к новой цене (350ms, easeOutCubic)  
✅ **60 FPS** — анимация обновляется каждый кадр  
✅ **Нет лишних setState** — `liveSegment` обновляется только при тиках  
✅ **Правильная архитектура** — анимация в отдельном слое

---

## 🗺️ Viewport и навигация

### Концепция:

Viewport — это **временное окно** `{ timeStart, timeEnd, autoFollow }`, а не индексы массивов.

**Пример:**
```typescript
{
  timeStart: 1704067200000, // 1 января 2024, 00:00:00
  timeEnd:   1704067260000, // 1 января 2024, 00:01:00
  autoFollow: false
}
```

### Операции:

**Zoom:**
```typescript
zoom(factor: number) {
  // factor > 1 = увеличить масштаб (меньше времени видно)
  // factor < 1 = уменьшить масштаб (больше времени видно)
  const center = (timeStart + timeEnd) / 2;
  const half = (timeEnd - timeStart) / 2 / factor;
  timeStart = center - half;
  timeEnd = center + half;
  autoFollow = false; // После zoom отключаем follow
}
```

**Pan:**
```typescript
pan(deltaMs: number) {
  // deltaMs > 0 = вправо (будущее)
  // deltaMs < 0 = влево (прошлое)
  timeStart += deltaMs;
  timeEnd += deltaMs;
  autoFollow = false; // После pan отключаем follow
}
```

**Auto-follow:**
```typescript
followNow(now: number) {
  if (!autoFollow) return;
  
  const window = timeEnd - timeStart;
  timeEnd = now;
  timeStart = now - window;
}
```

### Pan inertia (инерция):

После отпускания мыши график продолжает двигаться с затуханием.

**Реализация:**
```typescript
// При движении мыши собираем скорость
handleMouseMove(e) {
  const deltaX = currentX - lastX;
  const dt = now - lastTime;
  velocityRef.current = deltaX / dt; // px/ms
}

// При отпускании запускаем инерцию
handleMouseUp() {
  if (Math.abs(velocity) > 0.05) {
    activeRef.current = true;
  }
}

// В render loop применяем инерцию
advancePanInertia(now) {
  if (!activeRef.current) return;
  
  const deltaMs = -velocity * dt / pixelsPerMs;
  viewport.pan(deltaMs);
  
  velocity *= 0.92; // Friction (затухание)
  if (Math.abs(velocity) < 0.02) {
    activeRef.current = false; // Остановка
  }
}
```

---

## 🎨 Рендеринг

### Порядок отрисовки:

```typescript
function render(now: number) {
  // 1. Фон
  renderBackground(ctx, width, height);
  
  // 2. Сетка
  renderGrid({ ctx, viewport, width, height });
  
  // 3. История (immutable)
  renderLine({
    ticks: historyPoints,
    renderAreaFill: true,  // Градиент под линией
  });
  renderLine({
    ticks: historyPoints,
    renderAreaFill: false, // Сама линия
  });
  
  // 4. Live сегмент (ephemeral)
  if (liveSegment && animatedPrice) {
    renderLiveSegment({
      liveSegment,
      toPrice: animatedPrice, // ← Из аниматора!
    });
  }
  
  // 5. Пульсирующая точка
  renderPulsatingPoint({ price: animatedPrice ?? lastPoint.price });
  
  // 6. Линия экспирации
  renderExpirationLine(...);
  
  // 7. Hover highlight (CALL/PUT стрелки)
  renderHoverHighlight(...);
  
  // 8. Trades (сделки)
  renderTrades(...);
  
  // 9. Drawings (рисунки)
  renderDrawings(...);
  
  // 10. Индикаторы
  renderIndicators(...);
  
  // 11. Price line (горизонтальная линия текущей цены)
  renderPriceLine({ price: animatedPrice ?? lastPoint.price });
  
  // 12. Оси (цена, время)
  renderPriceAxis(...);
  renderTimeAxis(...);
  
  // 13. Crosshair
  renderCrosshair(...);
}
```

### Area fill (градиент под линией):

```typescript
function renderAreaFill(ctx, points, width, height) {
  // Находим самую верхнюю точку линии
  const minY = Math.min(...points.map(p => p.y));
  
  // Градиент от верхней точки до низа
  const gradient = ctx.createLinearGradient(0, minY, 0, height);
  gradient.addColorStop(0, 'rgba(59,130,246,0.35)');
  gradient.addColorStop(1, 'rgba(59,130,246,0.02)');
  
  // Рисуем path: линия → вниз → закрываем
  ctx.fillStyle = gradient;
  ctx.fill();
}
```

### Пульсирующая точка:

```typescript
function renderPulsatingPoint({ x, y, time }) {
  // Фаза пульсации (0..1)
  const pulsePhase = (time % 2000) / 2000;
  const pulseScale = 0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2);
  
  // Радиус свечения (пульсирует)
  const glowRadius = radius + pulseScale * 8;
  
  // Рисуем свечение (радиальный градиент)
  // Рисуем основной кружок
  // Рисуем блик
}
```

---

## 📊 Индикаторы

### Агрегация тиков в свечи:

Линейный график работает с тиками, но индикаторы требуют свечи. Поэтому тики агрегируются в свечи по timeframe (например, 5 секунд).

```typescript
function aggregateTicksToCandles(ticks, timeframeMs) {
  const candles = [];
  let currentCandle = null;
  
  for (const tick of ticks) {
    const slotStart = Math.floor(tick.time / timeframeMs) * timeframeMs;
    
    if (!currentCandle || currentCandle.startTime !== slotStart) {
      // Новая свеча
      if (currentCandle) candles.push(currentCandle);
      currentCandle = {
        startTime: slotStart,
        endTime: slotStart + timeframeMs,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
      };
    } else {
      // Обновляем текущую свечу
      currentCandle.high = Math.max(currentCandle.high, tick.price);
      currentCandle.low = Math.min(currentCandle.low, tick.price);
      currentCandle.close = tick.price;
    }
  }
  
  return candles;
}
```

### Вычисление индикаторов:

```typescript
const candles = aggregateTicksToCandles(ticks, 5000); // 5 секунд
const indicators = calculateIndicators(candles, configs);
// → SMA, EMA, Bollinger Bands, RSI, Stochastic, Momentum
```

---

## 🖱️ Взаимодействия (pan, zoom, inertia)

### Zoom (колесо мыши):

```typescript
handleWheel(e) {
  e.preventDefault();
  
  // Инвертируем: вверх = zoom in, вниз = zoom out
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  lineChart.zoom(factor);
  
  // Прерываем инерцию
  panInertiaRefs.activeRef.current = false;
}
```

### Pan (перетаскивание):

```typescript
handleMouseDown(e) {
  isPanningRef.current = true;
  lastPanXRef.current = e.clientX - rect.left;
  panInertiaRefs.activeRef.current = false; // Сбрасываем инерцию
}

handleMouseMove(e) {
  if (!isPanningRef.current) return;
  
  const deltaX = currentX - lastPanXRef.current;
  
  // Собираем скорость для инерции
  const dt = now - lastTime;
  panInertiaRefs.velocityRef.current = deltaX / dt; // px/ms
  
  // Pan viewport
  const pixelsPerMs = width / timeRange;
  const deltaMs = -deltaX / pixelsPerMs; // Инвертируем
  lineChart.pan(deltaMs);
}

handleMouseUp() {
  // Запускаем инерцию, если скорость выше порога
  if (Math.abs(velocity) > 0.05) {
    panInertiaRefs.activeRef.current = true;
  }
}
```

### Pan inertia (в render loop):

```typescript
function render(now) {
  // Применяем инерцию ДО отрисовки (она меняет viewport)
  if (panInertiaRefs.current) {
    advancePanInertia(now);
  }
  
  // ... рендерим
}

function advancePanInertia(now) {
  if (!activeRef.current) return;
  
  const velocity = velocityRef.current;
  const dt = 16; // ~1 frame при 60 FPS
  
  // Применяем скорость
  const deltaX = velocity * dt;
  const pixelsPerMs = width / timeRange;
  const deltaMs = -deltaX / pixelsPerMs;
  viewport.pan(deltaMs);
  
  // Затухание
  velocityRef.current *= 0.92; // Friction
  
  if (Math.abs(velocity) < 0.02) {
    activeRef.current = false; // Остановка
  }
}
```

---

## 🔑 Ключевые моменты реализации

### 1. Разделение истории и live-сегмента

✅ **История (immutable):**
- Записывается раз в секунду
- Никогда не мутируется
- Хранится в `pointStore`

✅ **Live сегмент (ephemeral):**
- Обновляется каждый тик
- Существует отдельно от истории
- Хранится в `liveSegmentRef` (ref, не state)
- Не перезаписывается каждый кадр

### 2. Анимация в отдельном слое

✅ **useLinePriceAnimator:**
- Отвечает только за плавное движение цены
- Не ломает логику записи истории
- Обновляется каждый кадр в render loop
- `toPrice` берётся из аниматора, не из liveSegment

### 3. Viewport как временное окно

✅ **Не индексы, а timestamp'ы:**
- Все операции работают с реальным временем
- Zoom/pan меняют временной диапазон
- Auto-follow обновляет окно до текущего времени

### 4. Render loop на RAF

✅ **60 FPS:**
- Обновление каждый кадр
- Аниматор обновляется в render loop
- Нет лишних setState/re-render

### 5. Seed аниматора при первом появлении

✅ **Предотвращает скачок:**
- При первом тике после появления live-сегмента
- `seedFrom(fromPrice)` устанавливает якорь
- Анимация начинается от `fromPrice`, не от 0

---

## 📝 Резюме

Линейный график построен по принципу разделения ответственности:

1. **useLinePointStore** — хранение истории точек
2. **useLineViewport** — управление временным окном
3. **useLineData** — интеграция с WebSocket, разделение истории и live-сегмента
4. **useLinePriceAnimator** — плавная анимация цены (lerp + easeOutCubic)
5. **useLineChart** — оркестратор, render loop, обработка событий

**Анимация:**
- Live сегмент обновляется только при тиках (не каждый кадр)
- Аниматор обновляется каждый кадр в render loop
- `toPrice` берётся из аниматора, не из liveSegment
- Seed при первом появлении предотвращает скачок

**Результат:**
- Плавная анимация (350ms, easeOutCubic)
- 60 FPS
- Правильная архитектура (анимация в отдельном слое)
- Нет лишних setState/re-render
