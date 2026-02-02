# FLOW LINE — Linear Tick Chart (Quotex-style)

## 🎯 Цель

Сделать линейный график на тиках, который:

- ✅ плавно двигается вправо во времени
- ✅ поддерживает zoom и pan
- ✅ НЕ использует таймфреймы
- ✅ НЕ зависит от свечей
- ✅ ведёт себя одинаково всегда (reload === live)

---

## 🧠 КЛЮЧЕВАЯ МЕНТАЛЬНАЯ МОДЕЛЬ

**Линейный график — это скользящее временное окно, а не набор дискретных свечей.**

Он **НЕ знает**, что такое:
- ❌ `5s` / `30s` / `1m` (таймфреймы)
- ❌ `open` / `high` / `low` / `close` (OHLC)
- ❌ `slot` / `anchorTime` (нормализация времени)

Он знает **ТОЛЬКО**:
- ✅ `(time, price)` — тики

---

## 🧩 ОСНОВНАЯ ИДЕЯ (как у Quotex)

1. **Виртуальное окно времени** (например, 60 секунд)
2. **Окно постоянно едет вправо** за новыми тиками
3. **Новые тики появляются справа**
4. **Старые выталкиваются слева**
5. **Zoom** = меняем ширину окна
6. **Pan** = сдвигаем окно вручную (и отключаем auto-follow)

---

## 📁 Структура файлов

```
frontend/components/chart/line/
├── lineTypes.ts          # Типы данных (TickPoint, LineViewport)
├── useTickStore.ts       # Хранилище тиков
├── useLineViewport.ts    # Viewport (временное окно)
├── useLineData.ts        # WebSocket интеграция
├── renderLine.ts         # Рендеринг на Canvas
├── useLineChart.ts       # Главный хук (оркестратор)
└── index.ts              # Экспорты
```

---

## 🔵 FLOW LINE-0 — Data Model

**Файл:** `lineTypes.ts`

```typescript
export type TickPoint = {
  time: number;   // timestamp (ms)
  price: number;
};

export type LineViewport = {
  timeStart: number;  // Начало временного окна
  timeEnd: number;    // Конец временного окна
  autoFollow: boolean; // Автоматически следовать за текущим временем
};
```

**Принцип:** Только тики, никаких свечей.

---

## 🔵 FLOW LINE-1 — Tick Store

**Файл:** `useTickStore.ts`

**Ответственность:**
- Хранит сырые тики `(time, price)`
- Ограничивает размер (MAX_TICKS = 3000)
- НЕ знает про canvas, viewport, рендеринг

**API:**
```typescript
const tickStore = useTickStore();

tickStore.pushTick({ time: 1234567890, price: 50000 });
const ticks = tickStore.getTicks();
const visibleTicks = tickStore.getTicksInRange(timeStart, timeEnd);
tickStore.reset();
```

**Особенности:**
- При превышении MAX_TICKS удаляются старые тики слева
- Тики хранятся в хронологическом порядке
- Нет нормализации времени (как есть)

---

## 🔵 FLOW LINE-2 — Line Viewport (СЕРДЦЕ)

**Файл:** `useLineViewport.ts`

**ИДЕЯ:** Viewport — это **временное окно**, а не индекс.

**Поведение:**

### Auto-Follow (по умолчанию включен)

```typescript
// При получении нового тика:
viewport.followNow(timestamp);

// Окно автоматически сдвигается вправо:
// timeEnd = timestamp
// timeStart = timestamp - windowMs
```

### Zoom

```typescript
viewport.zoom(2);  // Увеличить (меньше времени видно)
viewport.zoom(0.5); // Уменьшить (больше времени видно)

// После zoom autoFollow отключается
```

### Pan

```typescript
viewport.pan(5000);   // Сдвинуть вправо на 5 секунд
viewport.pan(-5000);   // Сдвинуть влево на 5 секунд

// После pan autoFollow отключается
```

### Reset Follow

```typescript
viewport.resetFollow(); // Включить auto-follow обратно
```

**API:**
```typescript
const viewport = useLineViewport();

viewport.followNow(Date.now());
viewport.zoom(2);
viewport.pan(5000);
viewport.resetFollow();
const vp = viewport.getViewport();
const windowMs = viewport.getWindowMs();
```

---

## 🔵 FLOW LINE-3 — WebSocket Integration

**Файл:** `useLineData.ts`

**Ответственность:**
- Подписка **ТОЛЬКО** на `price:update` (не на `candle:close`!)
- Добавление тиков в хранилище
- Обновление viewport (auto-follow)

**Как работает:**

```typescript
function onPriceUpdate(price: number, timestamp: number) {
  // 1. Добавляем тик
  tickStore.pushTick({ time: timestamp, price });
  
  // 2. Обновляем viewport (auto-follow)
  viewport.followNow(timestamp);
}
```

**Важно:** 
- ❌ НЕ подписываемся на `candle:close`
- ❌ НЕ используем свечи
- ✅ Только тики из `price:update`

---

## 🔵 FLOW LINE-4 — Rendering

**Файл:** `renderLine.ts`

**Ответственность:**
- Отрисовка линии из тиков на Canvas
- Преобразование `(time, price) → (x, y)`
- Фильтрация тиков по viewport

**Алгоритм:**

```typescript
function renderLine({ ctx, ticks, viewport, width, height, priceMin, priceMax }) {
  // 1. Фильтруем тики по временному окну
  const visibleTicks = ticks.filter(
    tick => tick.time >= viewport.timeStart && tick.time <= viewport.timeEnd
  );
  
  // 2. Сортируем по времени
  visibleTicks.sort((a, b) => a.time - b.time);
  
  // 3. Рисуем линию
  ctx.beginPath();
  for (const tick of visibleTicks) {
    const x = ((tick.time - viewport.timeStart) / timeRange) * width;
    const y = priceToY(tick.price, priceMin, priceMax, height);
    
    if (first) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}
```

**Вычисление диапазона цен:**

```typescript
function calculatePriceRange(ticks, viewport) {
  const visibleTicks = ticks.filter(
    tick => tick.time >= viewport.timeStart && tick.time <= viewport.timeEnd
  );
  
  const prices = visibleTicks.map(tick => tick.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  
  // Добавляем отступ для визуализации
  const padding = (max - min) * 0.1 || 1;
  return {
    min: min - padding,
    max: max + padding,
  };
}
```

---

## 🔵 FLOW LINE-5 — User Interactions

**Файл:** `useLineChart.ts`

**Главный хук**, который оркестрирует все компоненты.

**API:**

```typescript
const lineChart = useLineChart({
  canvasRef,
  onPriceUpdate: (price, timestamp) => { /* ... */ },
  enabled: true,
});

// Обработка обновления цены (из WebSocket)
lineChart.handlePriceUpdate(price, timestamp);

// Zoom
lineChart.zoom(2);

// Pan
lineChart.pan(5000);

// Reset follow
lineChart.resetFollow();

// Reset (очистить тики)
lineChart.reset();
```

**Поведение (как у Quotex):**

| Действие | Что происходит |
|----------|----------------|
| Новые тики | Окно едет вправо (auto-follow) |
| Zoom | Меняется windowMs, autoFollow = false |
| Pan | Окно сдвигается, autoFollow = false |
| Double click | `resetFollow()` — включить auto-follow |
| Reload | Всё идентично live (нет разницы) |

---

## 🚦 КРИТИЧЕСКИЕ ПРАВИЛА (НЕ НАРУШАТЬ)

### ❌ ЗАПРЕЩЕНО

- ❌ Не использовать candle data
- ❌ Не использовать timeframe
- ❌ Не использовать anchorTime
- ❌ Не использовать индексные viewport
- ❌ Не смешивать с свечным кодом

### ✅ РАЗРЕШЕНО

- ✅ Отдельная модель данных
- ✅ Отдельные хуки
- ✅ Отдельный рендер
- ✅ Только тики `(time, price)`

---

## 📝 Пример использования

```typescript
import { useLineChart } from '@/components/chart/line';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

function LineChartComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const lineChart = useLineChart({
    canvasRef,
    enabled: true,
  });

  // Интеграция с WebSocket
  useWebSocket({
    onPriceUpdate: lineChart.handlePriceUpdate,
    enabled: true,
  });

  // Обработка взаимодействий
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    lineChart.zoom(delta);
  };

  const handleDoubleClick = () => {
    lineChart.resetFollow();
  };

  return (
    <canvas
      ref={canvasRef}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      width={800}
      height={400}
    />
  );
}
```

---

## 🧠 ПОЧЕМУ ЭТО 100% ПРАВИЛЬНО

1. ✅ Так работает Quotex / Pocket / Binomo
2. ✅ Так работают tick charts в проф. терминалах
3. ✅ Это реальное время, а не симуляция
4. ✅ Одинаково работает всегда (reload === live)
5. ✅ Легко расширяется (area chart, glow, smoothing)

---

## 🔥 ИТОГ

**Линейный график — это НЕ проекция свечного графика.**

Это **отдельная система**, которая работает только с тиками `(time, price)` и не знает про свечи, таймфреймы и слоты времени.

**Ключевые отличия от свечного графика:**

| Свечной график | Линейный график |
|----------------|-----------------|
| Работает со свечами | Работает с тиками |
| Использует таймфреймы | Не знает про таймфреймы |
| Нормализует время | Использует реальное время |
| Viewport по индексам | Viewport по времени |
| Зависит от агрегации | Независим от агрегации |

**Результат:** Плавный, живой график, который всегда ведёт себя одинаково.
