# 🏷️ NAMING_CONVENTIONS.md — Конвенции именования инструментов

> **⚠️ КРИТИЧЕСКИ ВАЖНО:** 
> - **`instrumentId`** используется для **всех операций с данными** (агрегация, хранение, маршрутизация)
> - **`symbol`** используется **ТОЛЬКО** для UI отображения
> - OTC и REAL инструменты **полностью разделены** на уровне данных через `instrumentId`
> - Использование `symbol` для агрегации приводит к смешиванию данных от разных источников

## 📋 Содержание

1. [Основные концепции](#основные-концепции)
2. [Типы идентификаторов](#типы-идентификаторов)
3. [Суффиксы и префиксы](#суффиксы-и-префиксы)
4. [Где используется каждый тип](#где-используется-каждый-тип)
5. [Примеры](#примеры)
6. [Правила преобразования](#правила-преобразования)
7. [Важные правила](#важные-правила)

---

## 🧠 Основные концепции

В системе существует **три уровня идентификации** инструментов:

1. **`instrumentId`** — внутренний уникальный идентификатор (ключ в системе, используется для агрегации и хранения)
2. **`symbol`** — символ для UI отображения (только для визуализации, не для агрегации)
3. **`pair`** — пара для внешних API (формат провайдера)

### Ключевое правило

> **`instrumentId`** — это **единственный источник истины** для всех операций в системе.
> Все остальные идентификаторы (`symbol`, `pair`) являются производными от `instrumentId`.

### ⚠️ КРИТИЧЕСКОЕ ПРАВИЛО (Версия 3.0)

> **`instrumentId` используется для агрегации и хранения данных.**
> 
> **Почему это важно:**
> - OTC (`EURUSD`) и REAL (`EURUSD_REAL`) инструменты должны быть **полностью разделены**
> - Использование `symbol` (`EUR/USD`) для агрегации приводит к смешиванию свечей от разных источников
> - `CandleEngine`, `CandleStore`, `TimeframeAggregator` используют `instrumentId`
> - `symbol` используется **ТОЛЬКО** для UI отображения

---

## 🎯 Типы идентификаторов

### 1. `instrumentId` (Внутренний ID)

**Формат:**
- **OTC:** `EURUSD`, `GBPUSD`, `BTCUSD` (без суффикса)
- **REAL:** `EURUSD_REAL`, `GBPUSD_REAL`, `USDJPY_REAL` (с суффиксом `_REAL`)

**Где используется:**
- ✅ Ключ в `INSTRUMENTS` конфигурации (`backend/src/config/instruments.ts`)
- ✅ API endpoints: `?instrument=EURUSD_REAL` или `?symbol=EURUSD_REAL`
- ✅ WebSocket подписки: `subscribe({ instrument: 'EURUSD_REAL' })`
- ✅ База данных: поле `symbol` в таблице `price_points` и `candles` (логически это `instrumentId`)
- ✅ **Агрегация свечей:** `CandleEngine`, `CandleStore`, `TimeframeAggregator` используют `instrumentId`
- ✅ **Redis ключи:** `candle:active:${instrumentId}`, `price:${instrumentId}`
- ✅ Frontend: `instrument` state, localStorage ключи
- ✅ Логирование и отладка

**Примеры:**
```typescript
// Backend config
EURUSD: { id: 'EURUSD', source: 'otc', ... }
EURUSD_REAL: { id: 'EURUSD_REAL', source: 'real', ... }

// API request
GET /api/terminal/snapshot?instrument=EURUSD_REAL
GET /api/line/snapshot?symbol=EURUSD_REAL

// WebSocket
ws.send({ type: 'subscribe', instrument: 'EURUSD_REAL' })
```

---

### 2. `symbol` (Унифицированный торговый символ)

**Формат:**
- **Все инструменты (OTC и REAL):** `EUR/USD`, `GBP/JPY`, `BTC/USD` (всегда с разделителем `/`, всегда uppercase)

**Где используется:**
- ✅ `CandleEngine` — для группировки свечей
- ✅ `TimeframeAggregator` — для агрегации таймфреймов
- ✅ `PriceStore` (Redis) — ключи для текущих цен
- ✅ WebSocket broadcast: `price:update`, `candle:update` события
- ✅ Внутренняя логика группировки и маршрутизации

**Как получается:**
```typescript
// OTC инструмент
const symbol = config.engine.asset; // "EUR/USD"

// REAL инструмент
const symbol = config.real.symbol; // "EUR/USD" - унифицированный формат
```

**⚠️ Важно:** `symbol` теперь **одинаковый** для OTC и REAL инструментов одной пары. Это позволяет:
- Единообразно работать с инструментами независимо от источника
- Избежать дублирования ключей в Redis
- Легко переключаться между OTC и REAL режимами
- Поддерживать будущие функции (REAL candles, indicators, сравнение графиков)

**Примеры:**
```typescript
// Backend: PriceEngineManager.ts
// Унифицированный symbol для всех инструментов
if (config.source === 'otc') {
  symbol = config.engine.asset; // "EUR/USD"
} else if (config.source === 'real') {
  symbol = config.real.symbol; // "EUR/USD" - унифицированный формат
}

// Используется в CandleEngine (одинаковый symbol для OTC и REAL)
const candleEngine = new CandleEngine(symbol, candleStore, eventBus);
```

---

### 3. `pair` (Пара для внешних API)

**Формат:**
- Всегда: `EURUSD`, `GBPUSD`, `USDJPY` (без разделителя, uppercase)

**Где используется:**
- ✅ Только для REAL инструментов
- ✅ WebSocket подписка к `xchangeapi.com`: `{ pairs: ["EURUSD"] }`
- ✅ Парсинг сообщений от внешнего провайдера

**Как получается:**
```typescript
// Только для REAL инструментов
const pair = config.real.pair; // "EURUSD"
```

**Примеры:**
```typescript
// Backend: RealPriceEngine.ts
const subscribeMessage = JSON.stringify({ 
  pairs: [this.config.pair] // ["EURUSD"]
});

// WebSocket отправка
ws.send(subscribeMessage);
```

---

## 🏷️ Суффиксы и префиксы

### Суффикс `_REAL`

**Назначение:** Различает REAL инструменты от OTC.

**Правила:**
- ✅ **Всегда** используется для REAL инструментов
- ✅ Добавляется к базовому названию пары: `EURUSD` → `EURUSD_REAL`
- ✅ **Никогда** не используется для OTC инструментов
- ✅ **Никогда** не удаляется при работе с `instrumentId`

**Примеры:**
```typescript
// ✅ Правильно
EURUSD_REAL: { id: 'EURUSD_REAL', source: 'real', ... }
GBPJPY_REAL: { id: 'GBPJPY_REAL', source: 'real', ... }

// ❌ Неправильно
EURUSD: { id: 'EURUSD', source: 'real', ... } // Нет суффикса
EURUSD_REAL: { id: 'EURUSD', source: 'real', ... } // ID не совпадает с ключом
```

---

### Отсутствие суффикса (OTC)

**Назначение:** По умолчанию все инструменты без суффикса — OTC.

**Правила:**
- ✅ OTC инструменты **не имеют** суффикса `_REAL`
- ✅ `source: 'otc'` явно указывается в конфигурации
- ✅ Могут иметь суффикс в `label` для отображения: `"EUR/USD OTC"`

**Примеры:**
```typescript
// ✅ Правильно
EURUSD: { 
  id: 'EURUSD', 
  source: 'otc', 
  engine: { asset: 'EUR/USD', ... }
}

// Frontend label
{ id: 'EURUSD', label: 'EUR/USD OTC', digits: 5 }
```

---

## 📍 Где используется каждый тип

### Backend

#### 1. Конфигурация (`backend/src/config/instruments.ts`)

```typescript
// Ключ объекта = instrumentId
export const INSTRUMENTS: Record<string, InstrumentConfig> = {
  // OTC (без суффикса)
  EURUSD: {
    id: 'EURUSD',              // ← instrumentId
    source: 'otc',
    engine: {
      asset: 'EUR/USD',         // ← symbol (для внутренней логики)
    },
  },
  
  // REAL (с суффиксом _REAL)
  EURUSD_REAL: {
    id: 'EURUSD_REAL',          // ← instrumentId
    source: 'real',
    real: {
      pair: 'EURUSD',           // ← pair (для внешнего API)
    },
  },
};
```

#### 2. PriceEngineManager (`backend/src/prices/PriceEngineManager.ts`)

```typescript
for (const [instrumentId, config] of Object.entries(INSTRUMENTS)) {
  // Определяем symbol в зависимости от источника
  let symbol: string;
  if (config.source === 'otc') {
    symbol = config.engine.asset;        // "EUR/USD"
  } else if (config.source === 'real') {
    symbol = config.real.pair;          // "EURUSD"
  }
  
  // Используем instrumentId для записи price_points
  eventBus.on('price_tick', (event) => {
    this.pricePointWriter.handleTick(
      instrumentId,  // ← "EURUSD_REAL" (не symbol!)
      tick.price,
      tick.timestamp
    );
  });
}
```

#### 3. API Endpoints

**Terminal Snapshot:**
```typescript
// backend/src/modules/terminal/terminal.controller.ts
GET /api/terminal/snapshot?instrument=EURUSD_REAL
//                                 ↑ instrumentId
```

**Line Chart Snapshot:**
```typescript
// backend/src/modules/linechart/linechart.controller.ts
GET /api/line/snapshot?symbol=EURUSD_REAL
//                              ↑ instrumentId (параметр называется symbol, но это instrumentId!)
```

**Line Chart History:**
```typescript
GET /api/line/history?symbol=EURUSD_REAL&to=1234567890
//                         ↑ instrumentId
```

#### 4. База данных

**Таблица `price_points`:**
```sql
-- Поле symbol логически хранит instrumentId
CREATE TABLE price_points (
  symbol VARCHAR(255),    -- ← Здесь хранится "EURUSD_REAL" (instrumentId)
  timestamp BIGINT,
  price DECIMAL,
  PRIMARY KEY (symbol, timestamp)
);
```

**Примеры запросов:**
```typescript
// Prisma query
await prisma.pricePoint.findMany({
  where: { 
    symbol: instrumentId  // "EURUSD_REAL" (не "EURUSD"!)
  }
});
```

#### 5. WebSocket

**Подписка клиента:**
```typescript
// Frontend → Backend
ws.send({
  type: 'subscribe',
  instrument: 'EURUSD_REAL'  // ← instrumentId
});
```

**Broadcast событий:**
```typescript
// Backend → Frontend
ws.send({
  type: 'price:update',
  instrument: 'EURUSD_REAL',  // ← instrumentId
  data: { price: 1.19016, timestamp: 1234567890 }
});
```

**Внутренний symbol (для группировки):**
```typescript
// Backend: WebSocketManager.ts
// symbol используется для группировки подписок
const symbol = config.source === 'otc' 
  ? config.engine.asset      // "EUR/USD"
  : config.real.pair;       // "EURUSD"
```

---

### Frontend

#### 1. Конфигурация (`frontend/lib/instruments.ts`)

```typescript
export const INSTRUMENTS: InstrumentInfo[] = [
  // REAL (с суффиксом _REAL)
  { 
    id: 'EURUSD_REAL',           // ← instrumentId
    label: 'EUR/USD Real',        // ← Отображаемое название
    digits: 5 
  },
  
  // OTC (без суффикса)
  { 
    id: 'EURUSD',                 // ← instrumentId
    label: 'EUR/USD OTC',        // ← Отображаемое название
    digits: 5 
  },
];
```

#### 2. State и localStorage

```typescript
// Terminal page
const [instrument, setInstrument] = useState<string>('EURUSD_REAL');

// localStorage
localStorage.setItem('terminal.layout.v1', JSON.stringify({
  instrument: 'EURUSD_REAL'  // ← instrumentId
}));
```

#### 3. API запросы

```typescript
// Snapshot запрос
fetch(`/api/terminal/snapshot?instrument=${instrument}`)
//                                              ↑ instrumentId

// Line chart snapshot
fetch(`/api/line/snapshot?symbol=${instrument}`)
//                                    ↑ instrumentId (параметр называется symbol!)
```

#### 4. WebSocket подписки

```typescript
ws.send({
  type: 'subscribe',
  instrument: instrument  // ← instrumentId ('EURUSD_REAL')
});
```

---

## 📝 Примеры

### Пример 1: OTC инструмент (EURUSD)

```typescript
// Backend config
EURUSD: {
  id: 'EURUSD',                    // instrumentId
  base: 'EUR',
  quote: 'USD',
  source: 'otc',
  engine: {
    asset: 'EUR/USD',              // symbol (для внутренней логики)
  },
}

// Использование:
// - API: ?instrument=EURUSD
// - WebSocket: subscribe({ instrument: 'EURUSD' })
// - DB: price_points.symbol = 'EURUSD'
// - Redis: price:EUR/USD (используется symbol для группировки)
```

### Пример 2: REAL инструмент (EURUSD_REAL)

```typescript
// Backend config
EURUSD_REAL: {
  id: 'EURUSD_REAL',              // instrumentId
  base: 'EUR',
  quote: 'USD',
  source: 'real',
  real: {
    provider: 'xchange',
    symbol: 'EUR/USD',              // symbol (унифицированный для внутренней логики)
    pair: 'EURUSD',                  // pair (для внешнего API)
  },
}

// Использование:
// - API: ?instrument=EURUSD_REAL
// - WebSocket: subscribe({ instrument: 'EURUSD_REAL' })
// - DB: price_points.symbol = 'EURUSD_REAL' (логически это instrumentId)
// - External API: { pairs: ["EURUSD"] } (используется pair)
// - Redis: price:EUR/USD (используется унифицированный symbol для группировки)
// - CandleEngine: использует symbol 'EUR/USD' (одинаковый для OTC и REAL)
```

### Пример 3: Унифицированный symbol для OTC и REAL

```typescript
// У нас есть два разных инструмента:
// 1. EURUSD (OTC) - генерируемые цены
// 2. EURUSD_REAL (REAL) - реальные котировки

// Они имеют разные instrumentId:
instrumentId_OTC = 'EURUSD'
instrumentId_REAL = 'EURUSD_REAL'

// Но имеют ОДИНАКОВЫЙ symbol для группировки:
symbol_OTC = 'EUR/USD'
symbol_REAL = 'EUR/USD'  // ✅ Унифицированный формат

// В БД они хранятся отдельно (по instrumentId):
price_points: { symbol: 'EURUSD', ... }        // OTC данные (symbol = instrumentId)
price_points: { symbol: 'EURUSD_REAL', ... }   // REAL данные (symbol = instrumentId)

// Но в Redis и CandleEngine используют одинаковый symbol:
Redis: price:EUR/USD (для обоих)
CandleEngine: группирует по 'EUR/USD' (для обоих)
```

---

## 🔄 Правила преобразования

### ❌ ЗАПРЕЩЕНО

1. **Удалять суффикс `_REAL` из `instrumentId`:**
   ```typescript
   // ❌ НЕПРАВИЛЬНО
   const baseId = instrumentId.replace('_REAL', ''); // Плохо!
   const symbol = baseId; // Потеря информации!
   ```

2. **Преобразовывать `instrumentId` в `symbol` без учета источника:**
   ```typescript
   // ❌ НЕПРАВИЛЬНО
   const symbol = instrumentId; // Может быть "EURUSD_REAL"!
   ```

3. **Использовать `pair` вместо `instrumentId` в API:**
   ```typescript
   // ❌ НЕПРАВИЛЬНО
   GET /api/line/snapshot?symbol=EURUSD  // Для REAL инструмента!
   // Должно быть: ?symbol=EURUSD_REAL
   ```

4. **Смешивать OTC и REAL данные:**
   ```typescript
   // ❌ НЕПРАВИЛЬНО
   // Запрос snapshot для EURUSD_REAL, но получение данных из EURUSD (OTC)
   ```

### ✅ РАЗРЕШЕНО

1. **Использовать `instrumentId` напрямую везде:**
   ```typescript
   // ✅ ПРАВИЛЬНО
   const instrumentId = 'EURUSD_REAL';
   await prisma.pricePoint.findMany({
     where: { symbol: instrumentId }  // Используем как есть
   });
   ```

2. **Получать `symbol` из конфигурации:**
   ```typescript
   // ✅ ПРАВИЛЬНО
   const config = getInstrument(instrumentId);
   const symbol = config.source === 'otc' 
     ? config.engine.asset      // "EUR/USD"
     : config.real.symbol;      // "EUR/USD" - унифицированный формат
   ```

3. **Использовать `pair` только для внешних API:**
   ```typescript
   // ✅ ПРАВИЛЬНО
   if (config.source === 'real') {
     const pair = config.real.pair; // "EURUSD"
     ws.send(JSON.stringify({ pairs: [pair] }));
   }
   ```

---

## ⚠️ Важные правила

### 1. `instrumentId` — единственный источник истины

> **Всегда** используйте `instrumentId` для:
> - API запросов
> - WebSocket подписок
> - Запросов к БД (поле `symbol` логически хранит `instrumentId`)
> - Frontend state
> - localStorage

### 2. Суффикс `_REAL` обязателен для REAL инструментов

> **Всегда** добавляйте суффикс `_REAL` к `instrumentId` для REAL инструментов.
> Это позволяет системе различать OTC и REAL инструменты без дополнительных проверок.

### 3. Не преобразуйте `instrumentId` без необходимости

> **Не удаляйте** суффикс `_REAL` из `instrumentId`.
> Если нужен базовый символ, используйте `config.real.pair` или `config.engine.asset`.

### 4. `symbol` — унифицированный торговый символ (только для UI)

> `symbol` используется **ТОЛЬКО** для:
> - UI отображения (название инструмента)
> - Форматирования цен
> - Оси Y на графике
> - Лейблов и подписей
>
> **⚠️ ВАЖНО:** `symbol` **НЕ используется** для:
> - ❌ Агрегации свечей (`CandleEngine` использует `instrumentId`)
> - ❌ Хранения данных (БД использует `instrumentId`)
> - ❌ Redis ключей (используется `instrumentId`)
> - ❌ WebSocket маршрутизации (используется `instrumentId`)
>
> **Причина:** OTC и REAL инструменты должны быть **полностью разделены** на уровне данных и агрегации.
> Использование `symbol` для агрегации приводит к смешиванию данных от разных источников.

### 5. `pair` используется только для внешних API

> `pair` используется **только** для:
> - WebSocket подписки к `xchangeapi.com`
> - Парсинга сообщений от внешнего провайдера
>
> **Не используйте** `pair` внутри системы.

---

## 🎯 Краткая шпаргалка

| Контекст | Что использовать | Пример |
|----------|-----------------|--------|
| API endpoint (`?instrument=`) | `instrumentId` | `EURUSD_REAL` |
| API endpoint (`?symbol=`) | `instrumentId` | `EURUSD_REAL` |
| WebSocket subscribe | `instrumentId` | `EURUSD_REAL` |
| БД запрос (`price_points.symbol`) | `instrumentId` | `EURUSD_REAL` |
| Frontend state | `instrumentId` | `EURUSD_REAL` |
| localStorage | `instrumentId` | `EURUSD_REAL` |
| CandleEngine группировка | `instrumentId` | `EURUSD` или `EURUSD_REAL` |
| Redis ключи (candles) | `instrumentId` | `candle:active:EURUSD` или `candle:active:EURUSD_REAL` |
| Redis ключи (price) | `instrumentId` | `price:EURUSD` или `price:EURUSD_REAL` |
| WebSocket routing | `instrumentId` | `EURUSD` или `EURUSD_REAL` |
| UI display | `symbol` | `EUR/USD` (унифицированный) |
| External API (xchange) | `pair` | `EURUSD` |

---

## 📚 Связанные файлы

- `backend/src/config/instruments.ts` — конфигурация всех инструментов
- `frontend/lib/instruments.ts` — frontend registry инструментов
- `backend/src/prices/PriceEngineManager.ts` — логика определения `symbol`
- `backend/src/modules/linechart/linechart.controller.ts` — API endpoints
- `backend/src/modules/terminal/terminal.controller.ts` — terminal API
- `backend/src/prices/engines/RealPriceEngine.ts` — использование `pair` для внешнего API

---

**Последнее обновление:** 2026-01-30  
**Версия:** 3.0

---

## 🔄 История изменений

### Версия 3.0 (2026-01-30) — КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ
- ✅ **Разделение агрегации по `instrumentId`** — исправлена критическая проблема смешивания OTC и REAL свечей
- ✅ `CandleEngine` теперь использует `instrumentId` вместо `symbol` для агрегации
- ✅ `CandleStore` использует `instrumentId` для всех операций (Redis, БД)
- ✅ `TimeframeAggregator` использует `instrumentId` для агрегации
- ✅ `symbol` теперь используется **ТОЛЬКО** для UI отображения
- ✅ Полное разделение OTC и REAL источников на уровне данных

### Версия 2.0 (2026-01-30)
- ✅ **Унифицирован `symbol`** для всех инструментов (OTC и REAL)
- ✅ Теперь `symbol` всегда в формате `EUR/USD` (с разделителем `/`)
- ✅ Добавлено поле `real.symbol` в конфигурацию REAL инструментов
- ✅ `real.pair` используется только для внешнего API (xchangeapi.com)
- ⚠️ **Проблема:** `symbol` использовался для агрегации, что приводило к смешиванию OTC и REAL свечей

### Версия 1.0 (2026-01-30)
- Первоначальная версия документации
