# Архитектура свечного графика

Полное описание того, как работает свечной график в системе: от генерации цен на бэкенде до отображения на фронтенде.

---

## 📋 Содержание

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Backend: Генерация и хранение свечей](#backend-генерация-и-хранение-свечей)
3. [Backend: WebSocket события](#backend-websocket-события)
4. [Frontend: Получение и обработка данных](#frontend-получение-и-обработка-данных)
5. [Frontend: Рендеринг свечей](#frontend-рендеринг-свечей)
6. [Поток данных](#поток-данных)

---

## Обзор архитектуры

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  OtcPriceEngine → PriceTick → CandleEngine → Candle       │
│       (генерация)    (тик)      (агрегация)   (5s)         │
│                                                              │
│                          ↓                                   │
│                                                              │
│  TimeframeAggregator → Candle (10s, 1m, 1h...)             │
│      (агрегация)                                             │
│                                                              │
│                          ↓                                   │
│                                                              │
│  CandleStore → Redis (active) + PostgreSQL (closed)        │
│                                                              │
│                          ↓                                   │
│                                                              │
│  WebSocketManager → broadcast (price:update, candle:close) │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    WebSocket Connection
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  useWebSocket → useChartData → useRenderLoop → Canvas       │
│   (получение)    (хранение)     (рендер)      (отрисовка)  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend: Генерация и хранение свечей

### 1. Генерация цен (OtcPriceEngine)

**Файл:** `backend/src/prices/engines/OtcPriceEngine.ts`

**Назначение:** Генерирует тики цен (PriceTick) с заданной частотой.

**Как работает:**

```typescript
// Конфигурация для каждого инструмента
interface PriceConfig {
  asset: string;        // "BTC/USD", "EUR/USD"
  initialPrice: number; // Начальная цена
  minPrice: number;    // Минимальная цена
  maxPrice: number;    // Максимальная цена
  volatility: number;   // Волатильность (0-1)
  tickInterval: number; // Интервал генерации (мс)
}
```

**Алгоритм генерации:**

1. **Controlled Random Walk:**
   ```typescript
   const changePercent = (Math.random() - 0.5) * 2 * volatility;
   const change = currentPrice * changePercent;
   newPrice = currentPrice + change;
   ```

2. **Ограничение границами:**
   ```typescript
   if (newPrice < minPrice) newPrice = minPrice;
   if (newPrice > maxPrice) newPrice = maxPrice;
   ```

3. **Создание тика:**
   ```typescript
   const tick: PriceTick = {
     price: newPrice,
     timestamp: Date.now()
   };
   ```

4. **Эмиссия события:**
   - Событие `price_tick` отправляется в `PriceEventBus`
   - Тик сохраняется в `PriceStore` (Redis, ключ `price:current:${instrumentId}`)

**Хранение:**
- Текущая цена: Redis (`price:current:${instrumentId}`)
- История тиков не сохраняется (только свечи)

---

### 2. Агрегация в свечи (CandleEngine)

**Файл:** `backend/src/prices/engines/CandleEngine.ts`

**Назначение:** Агрегирует тики цен в 5-секундные свечи.

**Базовый timeframe:** `5s` (константа `BASE_TIMEFRAME_SECONDS = 5`)

**Как работает:**

#### 2.1. Обработка тика (`handlePriceTick`)

**Алгоритм slot-based времени:**

```typescript
// 1. Вычисляем текущий слот времени
const timeframeMs = 5000; // 5 секунд
const slotStart = Math.floor(now / timeframeMs) * timeframeMs;
const slotEnd = slotStart + timeframeMs;

// 2. Если свечи нет → открыть
if (!activeCandle) {
  openCandle(slotStart, slotEnd, tick);
  return;
}

// 3. Если тик в том же слоте → обновить
if (slotStart === activeCandle.timestamp) {
  updateCandle(tick);
  return;
}

// 4. Если тик в новом слоте → закрыть предыдущую и открыть новую
closeCandle();
openCandle(slotStart, slotEnd, tick);
```

**Важно:** Закрытие происходит по **абсолютным границам времени**, а не по интервалу. Это гарантирует синхронизацию между всеми клиентами.

#### 2.2. Открытие свечи (`openCandle`)

```typescript
activeCandle = {
  open: tick.price,
  high: tick.price,
  low: tick.price,
  close: tick.price,
  timestamp: slotStart,  // Нормализованное время начала слота
  timeframe: '5s'
};

// Сохраняем в Redis
candleStore.setActiveCandle(symbol, activeCandle);

// Эмитируем событие
eventBus.emit({
  type: 'candle_opened',
  data: activeCandle
});
```

#### 2.3. Обновление свечи (`updateCandle`)

```typescript
activeCandle.high = Math.max(activeCandle.high, tick.price);
activeCandle.low = Math.min(activeCandle.low, tick.price);
activeCandle.close = tick.price;

// Сохраняем обновленную свечу
candleStore.setActiveCandle(symbol, activeCandle);

// Эмитируем событие
eventBus.emit({
  type: 'candle_updated',
  data: activeCandle
});
```

#### 2.4. Закрытие свечи (`closeCandle`)

```typescript
// Сохраняем закрытую свечу в PostgreSQL
candleStore.addClosedCandle(symbol, activeCandle);

// Эмитируем событие с точным временем закрытия
const slotEnd = activeCandle.timestamp + 5000;
eventBus.emit({
  type: 'candle_closed',
  data: activeCandle,
  timestamp: slotEnd  // Точное время закрытия слота
});

// Очищаем активную свечу
activeCandle = null;
```

---

### 3. Агрегация в другие таймфреймы (TimeframeAggregator)

**Файл:** `backend/src/prices/engines/TimeframeAggregator.ts`

**Назначение:** Агрегирует 5-секундные свечи в другие таймфреймы (10s, 1m, 1h, и т.д.).

**Поддерживаемые таймфреймы:**
```typescript
['10s', '15s', '30s', '1m', '2m', '3m', '5m', 
 '10m', '15m', '30m', '1h', '4h', '1d']
```

**Как работает:**

1. **Подписка на закрытие 5s свечей:**
   ```typescript
   eventBus.on('candle_closed', (event) => {
     if (event.data.timeframe === '5s') {
       handleBaseCandle(event.data);
     }
   });
   ```

2. **Агрегация для каждого таймфрейма:**
   ```typescript
   private aggregateCandle(baseCandle: Candle, timeframe: Timeframe) {
     const timeframeSeconds = TIMEFRAME_SECONDS[timeframe];
     const slotStart = Math.floor(baseCandle.timestamp / (timeframeSeconds * 1000)) 
                       * (timeframeSeconds * 1000);
     
     // Если агрегатор пуст или новый слот → создать новую свечу
     if (!aggregator || aggregator.timestamp !== slotStart) {
       if (aggregator) {
         // Закрыть предыдущую свечу
         candleStore.addClosedCandle(symbol, aggregator);
       }
       // Открыть новую свечу
       aggregator = {
         open: baseCandle.open,
         high: baseCandle.high,
         low: baseCandle.low,
         close: baseCandle.close,
         timestamp: slotStart,
         timeframe
       };
     } else {
       // Обновить существующую свечу
       aggregator.high = Math.max(aggregator.high, baseCandle.high);
       aggregator.low = Math.min(aggregator.low, baseCandle.low);
       aggregator.close = baseCandle.close;
     }
   }
   ```

**Важно:** Все таймфреймы агрегируются из базового 5s таймфрейма. Это гарантирует консистентность данных.

---

### 4. Хранение свечей (CandleStore)

**Файл:** `backend/src/prices/store/CandleStore.ts`

**Назначение:** Управление хранением свечей (активные в Redis, закрытые в PostgreSQL).

#### 4.1. Активные свечи (Redis)

**Ключ:** `candle:active:${symbol}` (например, `candle:active:BTC/USD`)

**Структура:**
```typescript
{
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;  // Начало слота (нормализованное)
  timeframe: '5s'
}
```

**Операции:**
- `setActiveCandle(symbol, candle)` - сохранить активную свечу
- `getActiveCandle(symbol)` - получить активную свечу
- `clear(symbol)` - очистить активную свечу

**Зачем Redis:**
- Быстрый доступ к текущей свече
- Не требует персистентности (активная свеча временная)

#### 4.2. Закрытые свечи (PostgreSQL)

**Таблица:** `candles`

**Схема Prisma:**
```prisma
model Candle {
  id        String   @id @default(cuid())
  symbol    String   @default("BTC/USD")  // "BTC/USD", "EUR/USD"
  timeframe String   // '5s', '1m', '1h'
  timestamp BigInt   // начало свечи, ms
  open      Decimal
  high      Decimal
  low       Decimal
  close     Decimal

  @@unique([symbol, timeframe, timestamp])
  @@index([symbol, timeframe, timestamp(sort: Desc)])
}
```

**Операции:**
- `addClosedCandle(symbol, candle)` - сохранить закрытую свечу
- `getClosedCandles(symbol, timeframe, limit)` - получить последние N свечей
- `getClosedCandlesBefore(symbol, timeframe, toTime, limit)` - получить свечи до времени (для истории)

**Важно:** 
- Уникальный индекс `[symbol, timeframe, timestamp]` предотвращает дубликаты
- При ошибке `P2002` (duplicate) свеча игнорируется (уже существует)

---

### 5. Управление движками (PriceEngineManager)

**Файл:** `backend/src/prices/PriceEngineManager.ts`

**Назначение:** Управление множественными инстансами движков для каждого инструмента.

**Архитектура:**

```typescript
class PriceEngineManager {
  private engines = new Map<string, InstrumentEngines>();
  
  // Для каждого инструмента создается:
  interface InstrumentEngines {
    priceEngine: OtcPriceEngine;      // Генерация цен
    candleEngine: CandleEngine;       // Агрегация в 5s свечи
    aggregator: TimeframeAggregator;   // Агрегация в другие таймфреймы
    eventBus: PriceEventBus;           // События для WebSocket
  }
}
```

**Инициализация:**

```typescript
// При старте сервера (bootstrap)
for (const [instrumentId, config] of Object.entries(INSTRUMENTS)) {
  const eventBus = new PriceEventBus();
  const priceEngine = new OtcPriceEngine(config, instrumentId, priceStore, eventBus);
  const candleEngine = new CandleEngine(symbol, candleStore, eventBus);
  const aggregator = new TimeframeAggregator(symbol, timeframes, candleStore, eventBus);
  
  priceEngine.start();
  candleEngine.start();
  aggregator.start();
  
  engines.set(instrumentId, { priceEngine, candleEngine, aggregator, eventBus });
}
```

**API:**
- `getEventBus(instrumentId)` - получить eventBus для инструмента (для WebSocket)
- `getCurrentPrice(instrumentId)` - получить текущую цену
- `getCandles(instrumentId, timeframe, limit)` - получить свечи
- `getCandlesBefore(instrumentId, timeframe, toTime, limit)` - получить историю

---

## Backend: WebSocket события

### 1. WebSocket Manager

**Файл:** `backend/src/shared/websocket/WebSocketManager.ts`

**Назначение:** Управление WebSocket клиентами и рассылка событий.

**Структура:**

```typescript
class WebSocketManager {
  private clients: Set<WsClient> = new Set();
  private userClients: Map<string, Set<WsClient>> = new Map();
  
  // Регистрация клиента
  register(client: WsClient): void;
  
  // Отправка события всем клиентам
  broadcast(event: WsEvent): void;
  
  // Отправка события конкретному пользователю
  sendToUser(userId: string, event: WsEvent): void;
}
```

### 2. Подключение событий к WebSocket

**Файл:** `backend/src/bootstrap/websocket.bootstrap.ts`

**Как работает:**

```typescript
// Подписка на события из PriceEventBus
eventBus.on('price_tick', (event) => {
  wsManager.broadcast({
    type: 'price:update',
    instrument: instrumentId,
    data: {
      asset: symbol,
      price: tick.price,
      timestamp: tick.timestamp
    }
  });
});

eventBus.on('candle_closed', (event) => {
  wsManager.broadcast({
    type: 'candle:close',
    instrument: instrumentId,
    data: {
      timeframe: candle.timeframe,
      candle: {
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        timestamp: candle.timestamp
      }
    }
  });
});
```

**События, отправляемые клиентам:**

1. **`price:update`** - обновление цены (каждый тик)
   ```typescript
   {
     type: 'price:update',
     instrument: 'BTCUSD',
     data: {
       asset: 'BTC/USD',
       price: 50000.5,
       timestamp: 1234567890123
     }
   }
   ```

2. **`candle:close`** - закрытие свечи
   ```typescript
   {
     type: 'candle:close',
     instrument: 'BTCUSD',
     data: {
       timeframe: '5s',
       candle: {
         open: 50000,
         high: 50010,
         low: 49990,
         close: 50005,
         timestamp: 1234567890000
       }
     }
   }
   ```

3. **`server:time`** - серверное время (синхронизация)
   ```typescript
   {
     type: 'server:time',
     data: {
       timestamp: 1234567890123
     }
   }
   ```

---

## Frontend: Получение и обработка данных

### 1. WebSocket подключение

**Файл:** `frontend/lib/hooks/useWebSocket.ts`

**Состояния подключения:**
```typescript
type WSState = 'idle' | 'connecting' | 'ready' | 'subscribed' | 'closed';
```

**Жизненный цикл:**

1. **Подключение:**
   ```typescript
   ws = new WebSocket('ws://localhost:3001/ws');
   ```

2. **Handshake:**
   ```typescript
   // Сервер отправляет:
   { type: 'ws:ready', sessionId: '...', serverTime: 1234567890 }
   
   // Клиент подписывается на инструмент:
   ws.send(JSON.stringify({ 
     type: 'subscribe', 
     instrument: 'BTCUSD' 
   }));
   ```

3. **Получение событий:**
   ```typescript
   ws.onmessage = (event) => {
     const message = JSON.parse(event.data);
     
     if (message.type === 'price:update') {
       onPriceUpdate(message.data.price, message.data.timestamp);
     }
     
     if (message.type === 'candle:close') {
       onCandleClose(message.data.candle, message.data.timeframe);
     }
   };
   ```

### 2. Хранение данных (useChartData)

**Файл:** `frontend/components/chart/internal/useChartData.ts`

**Назначение:** Управление состоянием свечей на фронтенде.

**Структура данных:**

```typescript
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;  // Начало свечи (нормализованное)
  endTime: number;    // Конец свечи (нормализованное)
  isClosed: boolean;  // true для закрытых, false для live
}
```

**Хранение:**

```typescript
const candlesRef = useRef<Candle[]>([]);        // Закрытые свечи
const liveCandleRef = useRef<Candle | null>(null); // Текущая live-свеча
```

**Операции:**

#### 2.1. Инициализация из snapshot (`initializeFromSnapshot`)

**Когда вызывается:** При загрузке страницы или смене инструмента/таймфрейма.

**Источник данных:** HTTP GET `/api/terminal/snapshot?instrument=BTCUSD&timeframe=5s`

**Что делает:**

1. **Нормализация времени:**
   ```typescript
   // Каждая свеча занимает фиксированный слот времени
   // Это устраняет дырки между историческими свечами
   const anchorTime = lastSnapshotCandle.endTime;
   const firstNormalizedTime = anchorTime - (snapshotCandles.length * timeframeMs);
   
   for (let i = 0; i < snapshotCandles.length; i++) {
     const normalizedStartTime = firstNormalizedTime + i * timeframeMs;
     const normalizedEndTime = normalizedStartTime + timeframeMs;
     
     candles.push({
       ...snapshotCandle,
       startTime: normalizedStartTime,
       endTime: normalizedEndTime,
       isClosed: true
     });
   }
   ```

2. **Проверка инвариантов:**
   ```typescript
   // Инвариант: open[n] === close[n-1]
   for (let i = 1; i < candles.length; i++) {
     if (candles[i].open !== candles[i-1].close) {
       candles[i].open = candles[i-1].close; // Исправляем
     }
   }
   ```

3. **Создание live-свечи:**
   ```typescript
   const lastCandle = candles[candles.length - 1];
   liveCandleRef.current = {
     open: lastCandle.close,
     high: currentPrice,
     low: currentPrice,
     close: currentPrice,
     startTime: lastCandle.endTime,
     endTime: currentTime,
     isClosed: false
   };
   ```

#### 2.2. Обновление цены (`handlePriceUpdate`)

**Когда вызывается:** При получении `price:update` из WebSocket.

**Что делает:**

```typescript
if (!liveCandleRef.current) {
  // Создать новую live-свечу
  liveCandleRef.current = createLiveCandle(previousClose, previousEndTime, price, timestamp);
  return;
}

// Обновить существующую live-свечу
liveCandleRef.current = {
  ...liveCandle,
  high: Math.max(liveCandle.high, price),
  low: Math.min(liveCandle.low, price),
  close: price,
  endTime: timestamp  // Обновляется при каждом тике
};
```

#### 2.3. Закрытие свечи (`handleCandleClose`)

**Когда вызывается:** При получении `candle:close` из WebSocket.

**Что делает:**

1. **Нормализация времени закрытой свечи:**
   ```typescript
   // Используем нормализованное время из live-свечи
   const normalizedStartTime = lastCandle.endTime;
   const normalizedEndTime = normalizedStartTime + timeframeMs;
   ```

2. **Закрытие live-свечи:**
   ```typescript
   const closedCandle = {
     ...liveCandle,
     ...serverCandle,  // OHLC из сервера
     startTime: normalizedStartTime,
     endTime: normalizedEndTime,
     isClosed: true
   };
   
   candlesRef.current = [...candlesRef.current, closedCandle];
   ```

3. **Создание новой live-свечи:**
   ```typescript
   liveCandleRef.current = {
     open: closedCandle.close,
     high: closedCandle.close,
     low: closedCandle.close,
     close: closedCandle.close,
     startTime: normalizedEndTime,
     endTime: normalizedEndTime,
     isClosed: false
   };
   ```

**Важно:** 
- `startTime` всегда нормализован (фиксированные слоты)
- `endTime` для live-свечи обновляется при каждом тике
- При закрытии используется `startTime + timeframeMs` для нормализации

#### 2.4. Загрузка истории (`prependCandles`)

**Когда вызывается:** При скролле влево (загрузка старых свечей).

**Источник данных:** HTTP GET `/api/terminal/candles?instrument=BTCUSD&timeframe=5s&to=1234567890&limit=200`

**Что делает:**

1. **Дедупликация:**
   ```typescript
   const seen = realStartTimesRef.current; // Set реальных startTime
   const uniqueNew = newCandles.filter((c) => {
     if (seen.has(c.startTime)) return false;
     seen.add(c.startTime);
     return true;
   });
   ```

2. **Нормализация и prepend:**
   ```typescript
   // Нормализуем новые свечи относительно существующих
   const firstExistingTime = candlesRef.current[0].startTime;
   const firstNormalizedTime = firstExistingTime - (uniqueNew.length * timeframeMs);
   
   // Добавляем в начало массива
   candlesRef.current = [...normalizedNewCandles, ...candlesRef.current];
   ```

3. **Ограничение размера:**
   ```typescript
   const MAX_CANDLES = 3000;
   if (candlesRef.current.length > MAX_CANDLES) {
     candlesRef.current = candlesRef.current.slice(0, MAX_CANDLES);
   }
   ```

---

## Frontend: Рендеринг свечей

### 1. Render Loop

**Файл:** `frontend/components/chart/internal/useRenderLoop.ts`

**Назначение:** Основной цикл рендеринга на `requestAnimationFrame`.

**Как работает:**

```typescript
function renderLoop() {
  const ctx = canvasRef.current?.getContext('2d');
  if (!ctx) return;
  
  // 1. Очистка canvas
  ctx.clearRect(0, 0, width, height);
  
  // 2. Получение данных
  const candles = getRenderCandles();
  const liveCandle = getRenderLiveCandle();
  const viewport = getViewport();
  
  // 3. Рендеринг свечей
  renderCandles({
    ctx,
    viewport,
    candles,
    liveCandle,
    width,
    height,
    timeframeMs,
    mode: 'classic' // или 'bars', 'heikin_ashi'
  });
  
  // 4. Рендеринг других элементов (индикаторы, trade overlays, и т.д.)
  
  // 5. Следующий кадр
  requestAnimationFrame(renderLoop);
}
```

### 2. Рендеринг свечей (renderCandles)

**Файл:** `frontend/components/chart/internal/render/renderCandles.ts`

**Как работает:**

#### 2.1. Вычисление ширины свечи

```typescript
// Ширина одной свечи в пикселях = (timeframeMs / timeRange) * width
const timeRange = viewport.timeEnd - viewport.timeStart;
const rawWidth = (timeframeMs / timeRange) * width;

// Ограничение для предотвращения перекрытия
const distanceBetweenCenters = rawWidth;
const effectiveMaxWidth = Math.max(0, distanceBetweenCenters - CANDLE_GAP);
const candleWidth = Math.min(MAX_CANDLE_PX, effectiveMaxWidth);
```

**Важно:** Ширина зависит от плотности свечей (timeframe), а не от количества видимых свечей.

#### 2.2. Позиционирование свечи

```typescript
// Центр свечи вычисляется по времени (середина временного слота)
const candleCenterTime = candle.startTime + timeframeMs / 2;
const centerX = timeToX(candleCenterTime, viewport, width);
```

**Преобразование координат:**

```typescript
// Время → X координата
function timeToX(time: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  return ((time - viewport.timeStart) / timeRange) * width;
}

// Цена → Y координата
function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  return height - ((price - viewport.priceMin) / priceRange) * height;
}
```

#### 2.3. Отрисовка свечи (classic mode)

```typescript
function renderCandleClassic(ctx, candle, viewport, width, height, candleWidth, timeframeMs) {
  const centerX = timeToX(candle.startTime + timeframeMs / 2, viewport, width);
  const openY = priceToY(candle.open, viewport, height);
  const closeY = priceToY(candle.close, viewport, height);
  const highY = priceToY(candle.high, viewport, height);
  const lowY = priceToY(candle.low, viewport, height);
  
  const isGreen = candle.close >= candle.open;
  const color = isGreen ? GREEN_COLOR : RED_COLOR;
  
  // Фитиль (wick) - вертикальная линия от high до low
  ctx.strokeStyle = color;
  ctx.lineWidth = WICK_WIDTH;
  ctx.beginPath();
  ctx.moveTo(centerX, highY);
  ctx.lineTo(centerX, lowY);
  ctx.stroke();
  
  // Тело свечи - прямоугольник от open до close
  const bodyTop = Math.min(openY, closeY);
  const bodyBottom = Math.max(openY, closeY);
  const bodyHeight = Math.abs(closeY - openY) || 1;
  const bodyWidth = candleWidth * CANDLE_BODY_WIDTH_RATIO; // 0.7 от ширины
  
  ctx.fillStyle = color;
  ctx.fillRect(centerX - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
}
```

#### 2.4. Отрисовка свечи (bars mode)

```typescript
function renderCandleBars(ctx, candle, viewport, width, height, candleWidth, timeframeMs) {
  const centerX = timeToX(candle.startTime + timeframeMs / 2, viewport, width);
  
  // Вертикальная линия от low до high
  ctx.beginPath();
  ctx.moveTo(centerX, priceToY(candle.high, viewport, height));
  ctx.lineTo(centerX, priceToY(candle.low, viewport, height));
  ctx.stroke();
  
  // Горизонтальная черта слева = open
  ctx.beginPath();
  ctx.moveTo(centerX - tickWidth / 2, priceToY(candle.open, viewport, height));
  ctx.lineTo(centerX, priceToY(candle.open, viewport, height));
  ctx.stroke();
  
  // Горизонтальная черта справа = close
  ctx.beginPath();
  ctx.moveTo(centerX, priceToY(candle.close, viewport, height));
  ctx.lineTo(centerX + tickWidth / 2, priceToY(candle.close, viewport, height));
  ctx.stroke();
}
```

---

## Поток данных

### Полный цикл от генерации до отображения

```
1. BACKEND: OtcPriceEngine генерирует тик
   └─> PriceTick { price: 50000, timestamp: 1234567890 }
       └─> PriceEventBus.emit('price_tick')
           ├─> CandleEngine.handlePriceTick()
           │   └─> Обновляет activeCandle (Redis)
           │       └─> PriceEventBus.emit('candle_updated')
           │
           └─> WebSocketManager.broadcast('price:update')
               └─> FRONTEND: useWebSocket получает событие
                   └─> useChartData.handlePriceUpdate()
                       └─> Обновляет liveCandleRef
                           └─> useRenderLoop перерисовывает canvas

2. BACKEND: CandleEngine закрывает свечу (каждые 5 секунд)
   └─> CandleStore.addClosedCandle() → PostgreSQL
       └─> PriceEventBus.emit('candle_closed')
           ├─> TimeframeAggregator.handleBaseCandle()
           │   └─> Агрегирует в другие таймфреймы
           │       └─> CandleStore.addClosedCandle() → PostgreSQL
           │
           └─> WebSocketManager.broadcast('candle:close')
               └─> FRONTEND: useWebSocket получает событие
                   └─> useChartData.handleCandleClose()
                       ├─> Добавляет закрытую свечу в candlesRef
                       └─> Создает новую live-свечу
                           └─> useRenderLoop перерисовывает canvas
```

### Инициализация при загрузке страницы

```
1. FRONTEND: Запрос snapshot
   └─> GET /api/terminal/snapshot?instrument=BTCUSD&timeframe=5s
       └─> BACKEND: TerminalController.getSnapshot()
           ├─> PriceEngineManager.getCandles() → PostgreSQL
           ├─> PriceEngineManager.getCurrentPrice() → Redis
           └─> Возвращает:
               {
                 candles: [...],      // Последние 100 закрытых свечей
                 currentPrice: 50000,
                 currentTime: 1234567890
               }

2. FRONTEND: useChartData.initializeFromSnapshot()
   └─> Нормализует время свечей
       └─> Создает live-свечу
           └─> useRenderLoop отрисовывает график

3. FRONTEND: WebSocket подключение
   └─> Подписка на инструмент
       └─> Начинает получать price:update и candle:close
```

---

## Ключевые концепции

### 1. Нормализация времени

**Проблема:** Исторические свечи из БД могут иметь пропуски (нет свечи за определенный период).

**Решение:** Нормализация времени - каждая свеча занимает фиксированный слот времени.

```typescript
// До нормализации (есть пропуски):
Candle 1: startTime: 1000, endTime: 5000
Candle 2: startTime: 15000, endTime: 20000  // Пропуск!

// После нормализации (нет пропусков):
Candle 1: startTime: 1000, endTime: 6000
Candle 2: startTime: 6000, endTime: 11000
Candle 3: startTime: 11000, endTime: 16000
Candle 4: startTime: 16000, endTime: 21000
```

**Зачем:** Гарантирует равномерное распределение свечей на графике, без визуальных "дырок".

### 2. Slot-based время

**Проблема:** Закрытие свечей должно быть синхронизировано между всеми клиентами.

**Решение:** Использование абсолютных границ времени (слотов), а не относительных интервалов.

```typescript
// Слот времени для 5s свечи:
const slotStart = Math.floor(now / 5000) * 5000;
const slotEnd = slotStart + 5000;

// Все клиенты закрывают свечу в одно и то же время
// (когда timestamp тика выходит за границу slotEnd)
```

**Зачем:** Гарантирует консистентность данных между клиентами.

### 3. Инварианты данных

**Инвариант 1:** `high >= max(open, close)`
```typescript
const maxOpenClose = Math.max(candle.open, candle.close);
candle.high = Math.max(candle.high, maxOpenClose);
```

**Инвариант 2:** `low <= min(open, close)`
```typescript
const minOpenClose = Math.min(candle.open, candle.close);
candle.low = Math.min(candle.low, minOpenClose);
```

**Инвариант 3:** `open[n] === close[n-1]` (для последовательных свечей)
```typescript
if (candles[i].open !== candles[i-1].close) {
  candles[i].open = candles[i-1].close; // Исправляем
}
```

**Зачем:** Гарантирует корректность визуализации и расчетов.

---

## API Endpoints

### GET /api/terminal/snapshot

**Параметры:**
- `instrument` (optional) - ID инструмента (по умолчанию `BTCUSD`)
- `timeframe` (optional) - Таймфрейм (по умолчанию `5s`)

**Ответ:**
```typescript
{
  candles: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    startTime: number;
    endTime: number;
  }>;
  currentPrice: number;
  currentTime: number;
}
```

### GET /api/terminal/candles

**Параметры:**
- `instrument` (optional) - ID инструмента
- `timeframe` (optional) - Таймфрейм
- `to` (optional) - Время до которого загружать (timestamp в мс)
- `limit` (optional) - Максимальное количество свечей (по умолчанию 200)

**Ответ:**
```typescript
{
  items: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    startTime: number;
    endTime: number;
  }>;
}
```

---

## Заключение

Свечной график построен на принципах:

1. **Консистентность данных** - slot-based время, нормализация
2. **Производительность** - Redis для активных данных, PostgreSQL для истории
3. **Масштабируемость** - PriceEngineManager для множественных инструментов
4. **Реальное время** - WebSocket для мгновенных обновлений
5. **Надежность** - инварианты данных, обработка ошибок

Все компоненты работают вместе, обеспечивая плавную работу графика с миллисекундной точностью.
