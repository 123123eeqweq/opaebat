# LIVE CANDLE IMPLEMENTATION

## Обзор

Документация описывает полный жизненный цикл лайв-свечи (live candle) в системе: от генерации тиков на бэкенде до отображения на фронтенде.

---

## 🔴 BACKEND: Генерация и обработка свечей

### 1. Генерация ценовых тиков (Price Ticks)

**Файл:** `backend/src/prices/engines/OtcPriceEngine.ts`

**Процесс:**
- `OtcPriceEngine` генерирует ценовые тики каждые `tickInterval` миллисекунд (обычно 400-600ms)
- Использует контролируемый случайный блуждающий процесс (controlled random walk)
- Каждый тик содержит:
  ```typescript
  {
    price: number,      // Текущая цена
    timestamp: number    // Время тика (Date.now())
  }
  ```

**События:**
- При генерации тика эмитится событие `price_tick` через `PriceEventBus`

**Код:**
```typescript
private generateTick(): void {
  // Контролируемое случайное изменение цены
  const changePercent = (Math.random() - 0.5) * 2 * this.config.volatility;
  const change = this.currentPrice * changePercent;
  let newPrice = this.currentPrice + change;
  
  // Ограничение в пределах minPrice/maxPrice
  newPrice = Math.max(this.config.minPrice, Math.min(this.config.maxPrice, newPrice));
  
  this.currentPrice = newPrice;
  
  const tick: PriceTick = {
    price: this.currentPrice,
    timestamp: Date.now(),
  };
  
  // Эмитим событие
  this.eventBus.emit({
    type: 'price_tick',
    data: tick,
    timestamp: Date.now(),
  });
}
```

---

### 2. Агрегация тиков в 5-секундные свечи

**Файл:** `backend/src/prices/engines/CandleEngine.ts`

**Процесс:**
- `CandleEngine` подписывается на события `price_tick`
- Агрегирует тики в базовые 5-секундные свечи
- **ВАЖНО:** Закрытие свечей происходит по абсолютным границам времени, НЕ через `setInterval`

**Алгоритм обработки тика (`handlePriceTick`):**

```typescript
private handlePriceTick(tick: PriceTick): void {
  const now = tick.timestamp;
  const timeframeMs = 5000; // 5 секунд
  
  // Вычисляем текущий слот времени
  const slotStart = Math.floor(now / timeframeMs) * timeframeMs;
  const slotEnd = slotStart + timeframeMs;
  
  // 1️⃣ Если свечи нет → открыть
  if (!this.activeCandle) {
    this.openCandle(slotStart, slotEnd, tick);
    return;
  }
  
  // 2️⃣ Проверяем, в каком слоте находится тик
  const currentSlotStart = this.activeCandle.timestamp;
  const currentSlotEnd = currentSlotStart + timeframeMs;
  
  // Если тик всё ещё в текущем слоте → обновляем
  if (now < currentSlotEnd) {
    this.updateCandle(tick);
    return;
  }
  
  // 3️⃣ Если время вышло за слот → ЗАКРЫТЬ
  this.closeCandle();
  
  // 4️⃣ Открыть новую свечу
  this.openCandle(slotStart, slotEnd, tick);
}
```

**Открытие свечи (`openCandle`):**
```typescript
private openCandle(slotStart: number, slotEnd: number, tick: PriceTick): void {
  this.activeCandle = {
    open: tick.price,
    high: tick.price,
    low: tick.price,
    close: tick.price,
    timestamp: slotStart, // Нормализованное время начала слота
    timeframe: '5s',
  };
  
  // Сохраняем активную свечу
  this.candleStore.setActiveCandle(this.symbol, this.activeCandle);
  
  // Эмитим событие
  this.eventBus.emit({
    type: 'candle_opened',
    data: this.activeCandle,
    timestamp: Date.now(),
  });
}
```

**Обновление свечи (`updateCandle`):**
```typescript
private updateCandle(tick: PriceTick): void {
  if (!this.activeCandle) return;
  
  // Обновляем high/low/close
  this.activeCandle.high = Math.max(this.activeCandle.high, tick.price);
  this.activeCandle.low = Math.min(this.activeCandle.low, tick.price);
  this.activeCandle.close = tick.price;
  
  // Сохраняем обновленную свечу
  this.candleStore.setActiveCandle(this.symbol, this.activeCandle);
  
  // Эмитим событие
  this.eventBus.emit({
    type: 'candle_updated',
    data: this.activeCandle,
    timestamp: Date.now(),
  });
}
```

**Закрытие свечи (`closeCandle`):**
```typescript
private closeCandle(): void {
  if (!this.activeCandle) return;
  
  // Сохраняем закрытую свечу
  this.candleStore.addClosedCandle(this.symbol, this.activeCandle);
  
  // Эмитим событие с точным временем закрытия слота
  const slotEnd = this.activeCandle.timestamp + 5000;
  this.eventBus.emit({
    type: 'candle_closed',
    data: this.activeCandle,
    timestamp: slotEnd, // Точное время закрытия слота
  });
  
  // Очищаем активную свечу
  this.activeCandle = null;
}
```

**Ключевые моменты:**
- ✅ Свечи закрываются строго по границам времени (5s, 10s, 15s, ...)
- ✅ Нет использования `setInterval` для закрытия
- ✅ `timestamp` свечи нормализуется к началу слота
- ✅ Событие `candle_closed` имеет `timestamp = slotEnd` (точное время закрытия)

---

### 3. Агрегация в другие таймфреймы

**Файл:** `backend/src/prices/engines/TimeframeAggregator.ts`

**Процесс:**
- `TimeframeAggregator` подписывается на события `candle_closed` для 5s свечей
- Агрегирует закрытые 5s свечи в другие таймфреймы (10s, 30s, 1m, M15, H1, ...)
- Для каждого таймфрейма хранит активную агрегируемую свечу

**Алгоритм:**
```typescript
handleBaseCandle(candle: Candle): void {
  // Обрабатываем каждый таймфрейм
  for (const timeframe of this.timeframes) {
    const aggregator = this.aggregators.get(timeframe);
    
    if (!aggregator) {
      // Открываем новую агрегируемую свечу
      this.openAggregator(timeframe, candle);
    } else {
      // Обновляем существующую
      this.updateAggregator(timeframe, aggregator, candle);
      
      // Проверяем, нужно ли закрыть
      if (this.shouldCloseAggregator(timeframe, aggregator, candle)) {
        this.closeAggregator(timeframe, aggregator);
      }
    }
  }
}
```

**Важно:**
- Агрегированные свечи закрываются только когда накопилось достаточно 5s свечей
- Например, для 30s свеча закрывается каждые 6 закрытых 5s свечей
- Эмитится событие `candle_closed` с соответствующим `timeframe`

---

### 4. WebSocket Broadcasting

**Файл:** `backend/src/bootstrap/websocket.bootstrap.ts`

**Процесс:**
- Подписывается на события `price_tick`, `candle_updated`, `candle_closed` из `PriceEventBus`
- Транслирует события клиентам через WebSocket
- Фильтрует по инструменту (отправляет только подписанным клиентам)

**События, отправляемые клиентам:**

1. **`price:update`** (из `price_tick`):
```typescript
{
  instrument: "AUDCHF",
  type: "price:update",
  data: {
    asset: "AUDCHF",
    price: 0.56970,
    timestamp: 1769722735000
  }
}
```

2. **`candle:update`** (из `candle_updated`):
```typescript
{
  instrument: "AUDCHF",
  type: "candle:update",
  data: {
    timeframe: "5s",
    candle: {
      open: 0.56960,
      high: 0.56975,
      low: 0.56960,
      close: 0.56970,
      timestamp: 1769722730000,
      timeframe: "5s"
    }
  }
}
```

3. **`candle:close`** (из `candle_closed`):
```typescript
{
  instrument: "AUDCHF",
  type: "candle:close",
  data: {
    timeframe: "5s",
    candle: {
      open: 0.56960,
      high: 0.56975,
      low: 0.56960,
      close: 0.56963,
      timestamp: 1769722730000,
      timeframe: "5s"
    }
  }
}
```

4. **`server:time`** (каждую секунду):
```typescript
{
  type: "server:time",
  data: {
    timestamp: 1769722735000
  }
}
```

---

## 🟢 FRONTEND: Обработка и отображение

### 1. WebSocket Connection

**Файл:** `frontend/lib/hooks/useWebSocket.ts`

**Процесс:**
- Устанавливает WebSocket соединение с бэкендом
- Обрабатывает события `price:update`, `candle:update`, `candle:close`, `server:time`
- Фильтрует события по активному инструменту и таймфрейму

**Обработка событий:**
```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'price:update':
      // Обновление цены
      onPriceUpdate?.(message.data.price, message.data.timestamp);
      break;
      
    case 'candle:update':
      // Обновление активной свечи (пока не используется)
      break;
      
    case 'candle:close':
      // Закрытие свечи
      onCandleClose?.(message.data.candle, message.data.timeframe);
      break;
      
    case 'server:time':
      // Серверное время
      onServerTime?.(message.data.timestamp);
      break;
  }
};
```

---

### 2. Управление данными свечей

**Файл:** `frontend/components/chart/internal/useChartData.ts`

**Структура данных:**
```typescript
const candlesRef = useRef<Candle[]>([]);        // Закрытые свечи
const liveCandleRef = useRef<Candle | null>(null); // Лайв-свеча
const anchorTimeRef = useRef<number | null>(null); // Якорь времени
```

**FLOW FIX-LC: Slot-Based Time Model**

Все свечи вычисляются ТОЛЬКО от `anchorTime` и индекса:
```typescript
// ЕДИНСТВЕННЫЙ способ вычисления времени
startTime = anchorTime + index * timeframeMs
endTime = startTime + timeframeMs
```

**Инициализация из snapshot (`initializeFromSnapshot`):**
```typescript
// 1. Устанавливаем anchorTime от последней свечи snapshot
const lastSnapshotCandle = snapshotCandles[snapshotCandles.length - 1];
const anchorTime = Math.floor(lastSnapshotCandle.endTime / timeframeMs) * timeframeMs;
anchorTimeRef.current = anchorTime - (snapshotCandles.length * timeframeMs);

// 2. Вычисляем время всех свечей от anchorTime
for (let i = 0; i < snapshotCandles.length; i++) {
  const startTime = getCandleStartTime(i); // anchorTime + i * timeframeMs
  const endTime = getCandleEndTime(i);     // startTime + timeframeMs
  
  candlesRef.current.push({
    ...snapshotCandle,
    startTime,
    endTime,
    isClosed: true,
  });
}

// 3. Создаем лайв-свечу для следующего слота
const liveIndex = candlesRef.current.length;
liveCandleRef.current = {
  open: lastCandle.close,
  high: currentPrice,
  low: currentPrice,
  close: currentPrice,
  startTime: getCandleStartTime(liveIndex),
  endTime: getCandleEndTime(liveIndex),
  isClosed: false,
};
```

**Обработка обновления цены (`handlePriceUpdate`):**
```typescript
const handlePriceUpdate = (price: number, timestamp: number): void => {
  // Если лайв-свечи нет → создать
  if (!liveCandleRef.current) {
    const lastCandle = candlesRef.current[candlesRef.current.length - 1];
    const liveIndex = candlesRef.current.length;
    
    liveCandleRef.current = {
      open: lastCandle?.close ?? price,
      high: price,
      low: price,
      close: price,
      startTime: getCandleStartTime(liveIndex),
      endTime: getCandleEndTime(liveIndex),
      isClosed: false,
    };
    return;
  }
  
  // Обновляем OHLC лайв-свечи (время НЕ меняется!)
  liveCandleRef.current = {
    ...liveCandleRef.current,
    high: Math.max(liveCandleRef.current.high, price),
    low: Math.min(liveCandleRef.current.low, price),
    close: price,
    // startTime и endTime остаются неизменными!
  };
};
```

**Обработка закрытия свечи (`handleCandleClose`):**
```typescript
const handleCandleClose = (closedCandle: SnapshotCandle, nextCandleStartTime: number): void => {
  const currentLiveCandle = liveCandleRef.current;
  
  // ✅ Используем данные из лайв-свечи (единственный источник визуальной правды)
  const closedIndex = candlesRef.current.length;
  const closedStartTime = getCandleStartTime(closedIndex);
  const closedEndTime = getCandleEndTime(closedIndex);
  
  // Коммитим закрытую свечу
  const closedCandleToCommit = {
    ...currentLiveCandle, // ✅ ВСЕ данные из лайва
    isClosed: true,
    startTime: closedStartTime, // ✅ ТОЛЬКО от anchorTime и индекса
    endTime: closedEndTime,     // ✅ ТОЛЬКО от anchorTime и индекса
  };
  
  // Проверяем инвариант временной непрерывности
  const lastCandle = candlesRef.current[candlesRef.current.length - 1];
  if (lastCandle && closedCandleToCommit.startTime !== lastCandle.endTime) {
    // Исправляем автоматически
    closedCandleToCommit.startTime = lastCandle.endTime;
    closedCandleToCommit.endTime = closedCandleToCommit.startTime + timeframeMs;
  }
  
  // Добавляем в массив закрытых свечей
  candlesRef.current = [...candlesRef.current, closedCandleToCommit];
  
  // Создаем новую лайв-свечу для следующего слота
  const nextLiveIndex = candlesRef.current.length;
  liveCandleRef.current = {
    open: closedCandleToCommit.close,
    high: closedCandleToCommit.close,
    low: closedCandleToCommit.close,
    close: closedCandleToCommit.close,
    startTime: getCandleStartTime(nextLiveIndex),
    endTime: getCandleEndTime(nextLiveIndex),
    isClosed: false,
  };
};
```

**Ключевые принципы:**
- ✅ Время свечей вычисляется ТОЛЬКО от `anchorTime` и индекса
- ✅ НЕТ использования `timestamp` тиков для времени свечей
- ✅ НЕТ использования `server timestamp` для `startTime`
- ✅ Инвариант: `startTime[i+1] === endTime[i]` всегда
- ✅ Лайв-свеча не меняется визуально при закрытии (используются те же OHLC данные)

---

### 3. Интеграция в Chart

**Файл:** `frontend/components/chart/useChart.ts`

**Процесс:**
- Подключает `useChartData` для управления данными
- Подключает `useWebSocket` для получения событий
- Связывает события WebSocket с обработчиками данных

**Обработка событий:**
```typescript
useWebSocket({
  activeInstrumentRef,
  timeframe,
  onServerTime: (timestamp) => {
    // Обновление серверного времени
    serverTimeRef.current.timestamp = timestamp;
    lastSyncTimeRef.current = performance.now();
  },
  onPriceUpdate: (price, timestamp) => {
    // Обновление лайв-свечи
    chartData.handlePriceUpdate(price, timestamp);
    viewport.setLatestCandleTime(chartData.getLiveCandle()?.endTime ?? timestamp);
    candleAnimator.onPriceUpdate(price);
  },
  onCandleClose: (wsCandle, timeframeStr) => {
    // Закрытие свечи
    if (timeframeStr !== timeframe) return;
    
    const snapshotCandle = {
      open: wsCandle.open,
      high: wsCandle.high,
      low: wsCandle.low,
      close: wsCandle.close,
      startTime: wsCandle.timestamp,
      endTime: wsCandle.timestamp + parseTimeframeToMs(timeframeStr),
    };
    
    chartData.handleCandleClose(snapshotCandle, snapshotCandle.endTime);
    viewport.setLatestCandleTime(snapshotCandle.endTime);
    candleAnimator.onCandleClose();
  },
});
```

---

### 4. Рендеринг свечей

**Файл:** `frontend/components/chart/internal/render/renderCandles.ts`

**Процесс:**
- Получает массив закрытых свечей и лайв-свечу
- Рисует закрытые свечи
- Рисует лайв-свечу поверх закрытых

**Код:**
```typescript
export function renderCandles({
  candles,      // Закрытые свечи
  liveCandle,   // Лайв-свеча
  viewport,
  ...
}: RenderCandlesParams): void {
  // Рисуем закрытые свечи
  for (const candle of candles) {
    if (isCandleVisible(candle, viewport)) {
      renderCandle(ctx, candle, viewport, ..., false, mode);
    }
  }
  
  // Рисуем лайв-свечу
  if (liveCandle && isCandleVisible(liveCandle, viewport)) {
    renderCandle(ctx, liveCandle, viewport, ..., true, mode);
  }
}
```

---

## 🔄 Полный жизненный цикл лайв-свечи

### Пример: 5-секундная свеча

1. **Генерация тика (Backend)**
   - `OtcPriceEngine` генерирует тик: `{ price: 0.56970, timestamp: 1769722735000 }`
   - Эмитится `price_tick`

2. **Обработка тика (Backend)**
   - `CandleEngine` получает тик
   - Вычисляет слот: `slotStart = 1769722730000`, `slotEnd = 1769722735000`
   - Если тик в текущем слоте → обновляет `activeCandle` (high/low/close)
   - Эмитится `candle_updated`

3. **Broadcasting (Backend)**
   - `websocket.bootstrap` получает `candle_updated`
   - Отправляет клиентам: `{ type: 'candle:update', ... }`

4. **Получение на фронте**
   - `useWebSocket` получает событие
   - Вызывает `onPriceUpdate(price, timestamp)`

5. **Обновление данных (Frontend)**
   - `useChartData.handlePriceUpdate` обновляет `liveCandleRef.current`
   - Обновляет `high`, `low`, `close` (время НЕ меняется!)
   - Вызывает `onDataChange()`

6. **Рендеринг (Frontend)**
   - `useRenderLoop` получает обновление
   - Вызывает `renderCandles` с обновленной лайв-свечой
   - Canvas перерисовывается

7. **Закрытие свечи (Backend)**
   - При следующем тике, если `now >= slotEnd`
   - `CandleEngine.closeCandle()` закрывает свечу
   - Эмитится `candle_closed` с `timestamp = slotEnd`

8. **Broadcasting закрытия (Backend)**
   - Отправляется `{ type: 'candle:close', ... }`

9. **Обработка закрытия (Frontend)**
   - `useChartData.handleCandleClose` коммитит лайв-свечу в `candlesRef`
   - Создает новую лайв-свечу для следующего слота
   - Время вычисляется от `anchorTime` и индекса

10. **Рендеринг закрытой свечи (Frontend)**
    - Закрытая свеча рисуется как обычная свеча
    - Новая лайв-свеча рисуется справа

---

## 🎯 Ключевые архитектурные принципы

### 1. Server-Driven Architecture (FLOW CL)

- ✅ Сервер — единственный источник истины для времени и свечей
- ✅ Фронт только отображает данные, ничего не считает
- ✅ Свечи закрываются строго по границам таймфрейма
- ✅ Единый механизм для всех таймфреймов (5s, 30s, 1m, M15, H1)

### 2. Slot-Based Time Model (FLOW FIX-LC)

- ✅ Все свечи вычисляются от `anchorTime` и индекса
- ✅ `startTime = anchorTime + index * timeframeMs`
- ✅ Инвариант: `startTime[i+1] === endTime[i]` всегда
- ✅ НЕТ использования timestamp тиков для времени свечей

### 3. Visual Consistency (FLOW FIX-LC)

- ✅ Лайв-свеча = единственный источник визуальной правды
- ✅ При закрытии используются данные из лайв-свечи
- ✅ НЕТ визуальных "прыжков" при закрытии
- ✅ Лайв-свеча выглядит одинаково до и после закрытия

---

## 📊 Структура данных

### Candle (Frontend)
```typescript
interface Candle {
  open: number;        // Цена открытия
  high: number;        // Максимальная цена
  low: number;         // Минимальная цена
  close: number;       // Цена закрытия
  startTime: number;   // Начало свечи (от anchorTime + index)
  endTime: number;     // Конец свечи (startTime + timeframeMs)
  isClosed: boolean;   // Закрыта ли свеча
}
```

### ActiveCandle (Backend)
```typescript
interface ActiveCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;   // Нормализованное время начала слота
  timeframe: string;  // '5s'
}
```

---

## 🔍 Отладка

### Логирование

**Backend:**
- `[AUDCHF] Price tick: ...` — генерация тика
- `[AUDCHF] Candle closed ...` — закрытие свечи

**Frontend:**
- `[FIX-LC] CLOSE BEFORE:` — количество свечей до закрытия
- `[FIX-LC] CLOSE AFTER:` — количество свечей после закрытия
- `[FIX-LC] Time continuity check:` — проверка непрерывности времени

### Проверка инвариантов

1. **Временная непрерывность:**
   ```typescript
   for (let i = 1; i < candles.length; i++) {
     console.assert(candles[i].startTime === candles[i-1].endTime);
   }
   ```

2. **Визуальная консистентность:**
   - Лайв-свеча не должна менять OHLC при закрытии
   - Закрытая свеча должна иметь те же OHLC, что были в лайв-свече

---

## 🚀 Будущие улучшения

### Планируется (FLOW CL-4)

1. **Событие `candle:state`**
   - Единое событие для всех таймфреймов
   - Содержит данные свечи и информацию о времени (`slotEnd`)
   - Заменит `candle:update` и `price:update`

2. **MultiTimeframeCandleEngine**
   - Единый движок для всех таймфреймов
   - Убрать `TimeframeAggregator`
   - Все свечи генерируются напрямую от тиков

---

## 📝 Заключение

Текущая реализация обеспечивает:
- ✅ Точное закрытие свечей по границам времени
- ✅ Визуальную консистентность (нет прыжков)
- ✅ Временную непрерывность (нет дырок)
- ✅ Масштабируемость (работает на всех таймфреймах)
- ✅ Server-driven архитектуру (сервер — источник истины)
