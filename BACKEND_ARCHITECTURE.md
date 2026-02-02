# 🏗️ ПОЛНАЯ АРХИТЕКТУРА БЕКЕНДА — ДОКУМЕНТАЦИЯ

## 📋 СОДЕРЖАНИЕ

1. [Общая архитектура](#общая-архитектура)
2. [Структура проекта](#структура-проекта)
3. [Точка входа и Bootstrap](#точка-входа-и-bootstrap)
4. [Система цен и свечей (CORE)](#система-цен-и-свечей-core)
5. [WebSocket система](#websocket-система)
6. [API Endpoints](#api-endpoints)
7. [Domain Layer (Бизнес-логика)](#domain-layer-бизнес-логика)
8. [Infrastructure Layer](#infrastructure-layer)
9. [База данных](#база-данных)
10. [Конфигурация](#конфигурация)
11. [Потоки данных](#потоки-данных)

---

## 🎯 ОБЩАЯ АРХИТЕКТУРА

Бекенд построен на **Fastify** (Node.js) и использует **Clean Architecture** (порты и адаптеры).

### Основные принципы:

- **Многоинструментность**: Поддержка множества валютных пар (EURUSD, BTCUSD, ETHUSD и т.д.)
- **Реальное время**: WebSocket для передачи цен и событий свечей
- **Персистентность**: PostgreSQL для хранения закрытых свечей
- **In-memory**: Redis-подобный store для активных цен и свечей
- **Таймфрейм**: Только **5 секунд** (базовый таймфрейм)

### Технологический стек:

- **Runtime**: Node.js (ES Modules)
- **Framework**: Fastify
- **WebSocket**: `@fastify/websocket`
- **ORM**: Prisma
- **База данных**: PostgreSQL
- **In-memory store**: In-memory Map (замена Redis)
- **TypeScript**: Строгая типизация

---

## 📁 СТРУКТУРА ПРОЕКТА

```
backend/
├── src/
│   ├── server.ts                    # Точка входа
│   ├── app.ts                        # Fastify приложение
│   │
│   ├── bootstrap/                    # Инициализация систем
│   │   ├── index.ts                  # Главный bootstrap
│   │   ├── database.ts               # PostgreSQL подключение
│   │   ├── redis.ts                  # In-memory store
│   │   ├── prices.bootstrap.ts       # Запуск PriceEngineManager
│   │   ├── websocket.bootstrap.ts    # WebSocket события
│   │   ├── time.bootstrap.ts         # Таймеры для сделок
│   │   └── trades.bootstrap.ts       # Сервис закрытия сделок
│   │
│   ├── prices/                       # 🎯 CORE: Система цен и свечей
│   │   ├── PriceTypes.ts             # Типы (PriceTick, Candle, Timeframe)
│   │   ├── PriceService.ts           # Legacy facade (deprecated)
│   │   ├── PriceEngineManager.ts     # Менеджер engines для всех инструментов
│   │   │
│   │   ├── engines/                  # Движки генерации данных
│   │   │   ├── OtcPriceEngine.ts     # Генерация тиков цен
│   │   │   ├── CandleEngine.ts       # Агрегация тиков в 5s свечи
│   │   │   └── TimeframeAggregator.ts # Агрегация в другие TF (не используется)
│   │   │
│   │   ├── store/                    # Хранилища данных
│   │   │   ├── PriceStore.ts         # Текущая цена (in-memory)
│   │   │   └── CandleStore.ts        # Активные/закрытые свечи
│   │   │
│   │   └── events/                   # Event Bus
│   │       └── PriceEventBus.ts       # Pub/Sub для событий цен
│   │
│   ├── modules/                      # HTTP/WebSocket маршруты
│   │   ├── terminal/                 # API терминала (график)
│   │   │   ├── terminal.routes.ts    # Регистрация маршрутов
│   │   │   ├── terminal.controller.ts # Обработчики запросов
│   │   │   └── terminal.schema.ts    # Валидация запросов
│   │   │
│   │   ├── websocket/                # WebSocket маршруты
│   │   │   └── websocket.routes.ts   # WS подключения
│   │   │
│   │   ├── auth/                     # Аутентификация
│   │   ├── accounts/                 # Аккаунты пользователей
│   │   └── trades/                   # Сделки
│   │
│   ├── domain/                       # Бизнес-логика (чистая)
│   │   ├── terminal/                 # Терминал
│   │   │   ├── TerminalSnapshotService.ts    # Сервис снапшота
│   │   │   └── TerminalSnapshotTypes.ts     # Типы снапшота
│   │   │
│   │   ├── trades/                   # Сделки
│   │   ├── accounts/                 # Аккаунты
│   │   ├── auth/                     # Аутентификация
│   │   ├── time/                     # Время и таймеры
│   │   └── instruments/              # Инструменты
│   │
│   ├── infrastructure/               # Адаптеры (внешние зависимости)
│   │   ├── prisma/                   # Prisma репозитории
│   │   ├── terminal/                 # TerminalSnapshotAdapter
│   │   ├── pricing/                  # PriceServiceAdapter
│   │   ├── auth/                     # CookieAuthAdapter
│   │   ├── time/                     # SystemClock
│   │   └── websocket/                # WsAuthAdapter
│   │
│   ├── ports/                        # Интерфейсы (порты)
│   │   ├── repositories/             # Репозитории (User, Account, Trade)
│   │   ├── pricing/                  # PriceProvider
│   │   └── terminal/                 # TerminalSnapshotPort
│   │
│   ├── shared/                       # Общие утилиты
│   │   ├── logger.ts                 # Логирование
│   │   └── websocket/                # WebSocket инфраструктура
│   │       ├── WebSocketManager.ts   # Менеджер клиентов
│   │       ├── WsClient.ts           # Представление клиента
│   │       └── WsEvents.ts            # Типы событий WS
│   │
│   ├── config/                       # Конфигурация
│   │   ├── env.ts                    # Переменные окружения
│   │   └── instruments.ts           # Конфигурация инструментов
│   │
│   └── utils/                        # Утилиты
│       ├── crypto.ts                 # Хеширование паролей
│       └── shutdown.ts               # Graceful shutdown
│
├── prisma/
│   └── schema.prisma                 # Схема БД
│
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🚀 ТОЧКА ВХОДА И BOOTSTRAP

### `server.ts` — Точка входа

```typescript
// Загружает .env
// Создает Fastify app
// Запускает bootstrapAll()
// Настраивает graceful shutdown
// Запускает сервер на PORT
```

**Порядок инициализации:**

1. Загрузка переменных окружения (`dotenv/config`)
2. Создание Fastify приложения (`createApp()`)
3. Bootstrap всех систем (`bootstrapAll()`)
4. Настройка graceful shutdown
5. Запуск сервера на порту из `env.PORT`

---

### `bootstrap/index.ts` — Главный Bootstrap

**Последовательность инициализации:**

```typescript
bootstrapAll(app) {
  1. connectDatabase()      // PostgreSQL
  2. connectRedis()         // In-memory store
  3. initWebSocket(app)     // WebSocket сервер
  4. bootstrapPrices()      // PriceEngineManager
  5. bootstrapTrades()      // Trade closing service
  6. bootstrapTimeUpdates() // Таймеры для сделок
}
```

**Важно:** Порядок критичен! `bootstrapPrices()` должен быть после `initWebSocket()`, так как он подписывается на WebSocket события.

---

### `bootstrap/database.ts` — PostgreSQL

- Создает `PrismaClient`
- Подключается к БД через `DATABASE_URL`
- Экспортирует `getPrismaClient()` для доступа

**Использование:**
- Хранение закрытых свечей (`Candle` модель)
- Пользователи, аккаунты, сделки

---

### `bootstrap/redis.ts` — In-Memory Store

**Важно:** Это НЕ настоящий Redis! Это in-memory Map.

**Использование:**
- `PriceStore`: текущая цена по инструменту (`price:${instrumentId}`)
- `CandleStore`: активная свеча (`candle:active:${symbol}`)

**Ключи:**
- `price:BTCUSD` → `{ price: number, timestamp: number }`
- `candle:active:BTC/USD` → `{ open, high, low, close, timestamp, timeframe }`

---

### `bootstrap/prices.bootstrap.ts` — Запуск системы цен

**Что делает:**

1. Создает `PriceEngineManager`
2. Запускает все engines для всех инструментов
3. Подключает WebSocket события (`bootstrapWebSocketEvents`)

**Экспортирует:**
- `getPriceEngineManager()` — получить менеджер
- `bootstrapPrices()` — инициализация
- `shutdownPrices()` — остановка

---

### `bootstrap/websocket.bootstrap.ts` — WebSocket события

**Что делает:**

1. Подписывается на события `PriceEventBus` для каждого инструмента
2. Передает события в `WebSocketManager` для broadcast
3. Запускает интервал для `server:time` (каждую секунду)

**События:**
- `price_tick` → `price:update` (WS)
- `candle_updated` → `candle:update` (WS)
- `candle_closed` → `candle:close` (WS)

**Важно:** События отправляются только клиентам, подписанным на конкретный инструмент (`broadcastToInstrument`).

---

## 🎯 СИСТЕМА ЦЕН И СВЕЧЕЙ (CORE)

Это **сердце бекенда** для графика. Вся логика генерации цен и свечей находится здесь.

---

### `prices/PriceTypes.ts` — Типы данных

```typescript
// Тик цены
interface PriceTick {
  price: number;
  timestamp: number;
}

// Свеча
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;  // Начало свечи (округлено до 5s)
  timeframe: '5s';    // Только 5s
}

// Таймфрейм
type Timeframe = '5s';

// Конфигурация цены (для OtcPriceEngine)
interface PriceConfig {
  asset: string;           // "BTC/USD"
  initialPrice: number;     // Начальная цена
  minPrice: number;         // Минимум
  maxPrice: number;         // Максимум
  volatility: number;        // 0-1, волатильность
  tickInterval: number;     // Интервал тиков (мс)
}

// События цен
type PriceEventType = 'price_tick' | 'candle_opened' | 'candle_updated' | 'candle_closed';

interface PriceEvent {
  type: PriceEventType;
  data: PriceTick | Candle;
  timestamp: number;
}
```

---

### `prices/PriceEngineManager.ts` — Менеджер engines

**Назначение:** Управляет множеством engines для всех инструментов.

**Архитектура:**

```typescript
Map<instrumentId, {
  priceEngine: OtcPriceEngine,      // Генерирует тики
  candleEngine: CandleEngine,         // Агрегирует в свечи
  aggregator: TimeframeAggregator,    // Не используется (только 5s)
  eventBus: PriceEventBus             // События для этого инструмента
}>
```

**Методы:**

- `start()` — запускает все engines для всех инструментов
- `stop()` — останавливает все
- `getEventBus(instrumentId)` — получить event bus для инструмента
- `getCurrentPrice(instrumentId)` — текущая цена
- `getCandles(instrumentId, timeframe, limit)` — последние N свечей
- `getCandlesBefore(instrumentId, timeframe, toTime, limit)` — свечи до времени (для истории)

**Важно:** Каждый инструмент имеет свой собственный `PriceEventBus`, чтобы события не смешивались.

---

### `prices/engines/OtcPriceEngine.ts` — Генератор цен

**Назначение:** Генерирует тики цен используя контролируемый random walk.

**Алгоритм:**

1. Каждые `tickInterval` мс (обычно 500мс):
   - Вычисляет изменение: `changePercent = (random - 0.5) * 2 * volatility`
   - Применяет изменение к текущей цене
   - Ограничивает цену в пределах `[minPrice, maxPrice]`
   - Сохраняет в `PriceStore`
   - Эмитит событие `price_tick` через `PriceEventBus`

**Конфигурация (из `instruments.ts`):**

- Forex: `volatility: 0.0002`, `tickInterval: 500`
- Crypto: `volatility: 0.001`, `tickInterval: 500`

**Методы:**

- `start()` — запускает интервал генерации
- `stop()` — останавливает
- `getCurrentPrice()` — возвращает текущий тик

---

### `prices/engines/CandleEngine.ts` — Агрегатор свечей

**Назначение:** Агрегирует тики цен в 5-секундные свечи.

**Логика:**

1. **Подписка на `price_tick` события:**
   - Если нет активной свечи → открывает новую
   - Если есть активная → обновляет (high/low/close)

2. **Интервал закрытия (каждые 5 секунд):**
   - Закрывает текущую свечу
   - Сохраняет в `CandleStore` (PostgreSQL)
   - Эмитит `candle_closed`
   - Очищает активную свечу

**Округление времени:**

```typescript
const candleStart = Math.floor(now / 5000) * 5000; // Округление до 5s
```

**Структура свечи:**

```typescript
{
  open: tick.price,      // Первый тик в периоде
  high: max(тики),       // Максимум
  low: min(тики),        // Минимум
  close: последний_тик,  // Последний тик
  timestamp: candleStart, // Округленное время начала
  timeframe: '5s'
}
```

**Методы:**

- `start()` — подписывается на события и запускает интервал
- `stop()` — отписывается и закрывает текущую свечу
- `handlePriceTick()` — обрабатывает тик
- `openCandle()` — открывает новую свечу
- `updateCandle()` — обновляет активную свечу
- `closeCandle()` — закрывает и сохраняет свечу

---

### `prices/engines/TimeframeAggregator.ts` — Агрегатор таймфреймов

**Статус:** Не используется (только 5s таймфрейм).

**Назначение:** Агрегирует 5s свечи в другие таймфреймы (если бы они были).

**Логика (если бы использовалась):**

1. Подписывается на `candle_closed` (5s)
2. Группирует свечи по периодам большего таймфрейма
3. Создает агрегированные свечи:
   - `open` = `close` предыдущей свечи
   - `high` = max всех свечей
   - `low` = min всех свечей
   - `close` = последняя свеча
4. Сохраняет в `CandleStore`

---

### `prices/store/PriceStore.ts` — Хранилище цен

**Назначение:** Хранит текущую цену для каждого инструмента (in-memory).

**Ключи:**
- `price:${instrumentId}` → `{ price: number, timestamp: number }`

**Методы:**

- `setCurrentPrice(instrumentId, tick)` — сохранить цену
- `getCurrentPrice(instrumentId)` — получить цену
- `clear(instrumentId)` — очистить

**Использование:**
- `OtcPriceEngine` сохраняет каждый тик
- `TerminalSnapshotAdapter` читает для снапшота

---

### `prices/store/CandleStore.ts` — Хранилище свечей

**Назначение:** Управляет активными и закрытыми свечами.

**Активные свечи (in-memory):**
- Ключ: `candle:active:${symbol}` (например, `candle:active:BTC/USD`)
- Хранится в in-memory store
- Обновляется каждым тиком

**Закрытые свечи (PostgreSQL):**
- Таблица `Candle` в БД
- Сохраняются при закрытии свечи
- Используются для истории графика

**Методы:**

- `setActiveCandle(symbol, candle)` — сохранить активную свечу
- `getActiveCandle(symbol)` — получить активную свечу
- `addClosedCandle(symbol, candle)` — сохранить закрытую свечу в БД
- `getClosedCandles(symbol, timeframe, limit)` — последние N свечей
- `getClosedCandlesBefore(symbol, timeframe, toTime, limit)` — свечи до времени (для панорамирования)

**Важно:** `symbol` — это `engine.asset` (например, `"BTC/USD"`), а не `instrumentId` (например, `"BTCUSD"`).

---

### `prices/events/PriceEventBus.ts` — Event Bus

**Назначение:** Pub/Sub система для событий цен.

**Архитектура:**

```typescript
Map<PriceEventType, Set<EventHandler>>
```

**Методы:**

- `on(eventType, handler)` — подписаться на событие, возвращает unsubscribe функцию
- `emit(event)` — эмитит событие всем подписчикам
- `clear()` — очистить все подписки

**События:**

1. `price_tick` — новый тик цены
2. `candle_opened` — открыта новая свеча
3. `candle_updated` — обновлена активная свеча
4. `candle_closed` — закрыта свеча

**Подписчики:**

- `CandleEngine` → подписывается на `price_tick`
- `TimeframeAggregator` → подписывается на `candle_closed` (не используется)
- `websocket.bootstrap.ts` → подписывается на все события для broadcast

---

## 🔌 WEBSOCKET СИСТЕМА

### `shared/websocket/WebSocketManager.ts` — Менеджер клиентов

**Назначение:** Управляет подключенными WebSocket клиентами.

**Структура:**

```typescript
{
  clients: Set<WsClient>,                    // Все клиенты
  userClients: Map<userId, Set<WsClient>>    // Клиенты по пользователям
}
```

**Методы:**

- `register(client)` — зарегистрировать клиента
- `unregister(client)` — удалить клиента
- `broadcast(event)` — отправить всем аутентифицированным клиентам
- `sendToUser(userId, event)` — отправить конкретному пользователю
- `broadcastToInstrument(instrument, event)` — **отправить только клиентам, подписанным на инструмент**

**Важно:** `broadcastToInstrument` используется для ценовых событий (`price:update`, `candle:update`, `candle:close`).

---

### `shared/websocket/WsClient.ts` — Представление клиента

**Свойства:**

```typescript
{
  userId: string | null,           // ID пользователя
  isAuthenticated: boolean,        // Аутентифицирован ли
  instrument: string | null        // Текущая подписка (EURUSD, BTCUSD, ...)
}
```

**Методы:**

- `send(event)` — отправить событие клиенту
- `close()` — закрыть соединение
- `isOpen()` — проверка, открыто ли соединение

**Важно:** `instrument` устанавливается через сообщение `{ type: 'subscribe', instrument: 'EURUSD' }`.

---

### `shared/websocket/WsEvents.ts` — Типы событий

**События от сервера к клиенту:**

```typescript
// Обновление цены (только для подписанных на инструмент)
{ 
  instrument: 'EURUSD',
  type: 'price:update',
  data: { asset: 'EUR/USD', price: 1.08, timestamp: 1234567890 }
}

// Обновление активной свечи
{
  instrument: 'EURUSD',
  type: 'candle:update',
  data: { timeframe: '5s', candle: { open, high, low, close, timestamp, timeframe } }
}

// Закрытие свечи
{
  instrument: 'EURUSD',
  type: 'candle:close',
  data: { timeframe: '5s', candle: { ... } }
}

// Время сервера (всем клиентам)
{
  type: 'server:time',
  data: { timestamp: 1234567890 }
}

// Открытие сделки (конкретному пользователю)
{
  type: 'trade:open',
  data: { id, direction, amount, ... }
}

// Закрытие сделки
{
  type: 'trade:close',
  data: { id, result: 'WIN' | 'LOSS', ... }
}

// Таймер сделки
{
  type: 'trade:countdown',
  data: { tradeId: string, secondsLeft: number }
}
```

**Сообщения от клиента к серверу:**

```typescript
// Ping (получить server:time)
{ type: 'ping' }

// Подписка на инструмент
{ type: 'subscribe', instrument: 'EURUSD' }

// Отписка
{ type: 'unsubscribe' }
```

---

### `modules/websocket/websocket.routes.ts` — WebSocket маршрут

**Endpoint:** `GET /ws`

**Процесс подключения:**

1. **Аутентификация:**
   - Проверка cookie/session через `authenticateWebSocket()`
   - Если не аутентифицирован → закрытие соединения

2. **Регистрация клиента:**
   - Создание `WsClient`
   - Установка `userId` и `isAuthenticated`
   - Регистрация в `WebSocketManager`

3. **Обработка сообщений:**
   - `ping` → отправка `server:time`
   - `subscribe` → установка `client.instrument = data.instrument`

4. **Обработка закрытия:**
   - Отписка клиента из `WebSocketManager`

**Важно:** После подписки (`subscribe`), клиент начинает получать события только для этого инструмента через `broadcastToInstrument`.

---

## 🌐 API ENDPOINTS

### `modules/terminal/terminal.routes.ts` — Маршруты терминала

**Регистрация:**

```typescript
app.get('/api/terminal/snapshot', ...)  // Снапшот терминала
app.get('/api/quotes/candles', ...)      // Исторические свечи
```

---

### `GET /api/terminal/snapshot` — Снапшот терминала

**Назначение:** Получить полный снапшот состояния терминала для графика.

**Query параметры:**

- `instrument` (optional, default: `EURUSD`) — ID инструмента
- `timeframe` (optional, default: `5s`) — Таймфрейм (только `5s`)

**Требования:**

- Аутентификация: `requireAuth` middleware

**Ответ:**

```typescript
{
  instrument: 'EURUSD',
  user: { id: string, email: string },
  accounts: [...],
  activeAccount: { id, type, balance, currency } | null,
  price: { asset: 'EUR/USD', value: 1.08, timestamp: 1234567890 },
  candles: {
    timeframe: '5s',
    items: [
      { open, high, low, close, startTime, endTime },
      ...
    ]
  },
  openTrades: [...],
  serverTime: 1234567890
}
```

**Обработчик:** `TerminalController.getSnapshot()`

**Поток:**

1. Получение `userId` из сессии
2. Вызов `TerminalSnapshotService.getSnapshot()`
3. Агрегация данных через `TerminalSnapshotAdapter`:
   - Пользователь и аккаунты из БД
   - Текущая цена из `PriceEngineManager`
   - Последние 100 свечей из `CandleStore`
   - Открытые сделки из БД
   - Серверное время

---

### `GET /api/quotes/candles` — Исторические свечи

**Назначение:** Получить исторические свечи для панорамирования графика.

**Query параметры:**

- `instrument` (optional, default: `EURUSD`) — ID инструмента
- `timeframe` (optional, default: `5s`) — Таймфрейм
- `to` (optional, default: `Date.now()`) — Время "до" (timestamp в мс)
- `limit` (optional, default: `200`) — Максимум свечей

**Требования:**

- Аутентификация: `requireAuth` middleware

**Ответ:**

```typescript
{
  items: [
    {
      open: number,
      high: number,
      low: number,
      close: number,
      startTime: number,  // timestamp начала свечи
      endTime: number      // timestamp конца свечи
    },
    ...
  ]
}
```

**Обработчик:** `TerminalController.getCandles()`

**Поток:**

1. Парсинг параметров
2. Вызов `PriceEngineManager.getCandlesBefore(instrument, timeframe, toTime, limit)`
3. Преобразование в формат с `startTime` и `endTime`
4. Возврат ответа

**Важно:** `toTime` — это время "до" (не включительно). Запрос вернет свечи, у которых `timestamp < toTime`.

---

## 🏛️ DOMAIN LAYER (Бизнес-логика)

### `domain/terminal/TerminalSnapshotService.ts` — Сервис снапшота

**Назначение:** Оркестрация получения снапшота терминала.

**Методы:**

- `getSnapshot(userId, instrument, timeframe)` — получить снапшот

**Архитектура:** Чистая оркестрация, без бизнес-логики. Вся логика в адаптере.

---

### `domain/terminal/TerminalSnapshotTypes.ts` — Типы снапшота

**Структура:**

```typescript
interface TerminalSnapshot {
  instrument: string;        // instrumentId (EURUSD, BTCUSD, ...)
  user: { id, email },
  accounts: [...],
  activeAccount: {...} | null,
  price: { asset, value, timestamp },
  candles: {
    timeframe: Timeframe,
    items: SnapshotCandle[]
  },
  openTrades: [...],
  serverTime: number
}

interface SnapshotCandle {
  open: number,
  high: number,
  low: number,
  close: number,
  startTime: number,  // timestamp начала
  endTime: number     // timestamp конца
}
```

---

## 🔧 INFRASTRUCTURE LAYER

### `infrastructure/terminal/TerminalSnapshotAdapter.ts` — Адаптер снапшота

**Назначение:** Агрегирует данные из различных источников для снапшота.

**Зависимости:**

- `UserRepository` — пользователи
- `AccountRepository` — аккаунты
- `TradeRepository` — сделки
- `PriceEngineManager` — цены и свечи
- `Clock` — время

**Методы:**

- `getSnapshot(userId, instrument, timeframe)` — агрегирует все данные

**Поток:**

1. Получение пользователя из БД
2. Получение аккаунтов из БД
3. Получение активного аккаунта
4. Получение текущей цены из `PriceEngineManager`
5. Получение последних 100 свечей
6. Получение открытых сделок
7. Вычисление `serverTime`
8. Формирование ответа

---

### `infrastructure/prisma/` — Prisma репозитории

**Репозитории:**

- `PrismaUserRepository` — пользователи
- `PrismaAccountRepository` — аккаунты
- `PrismaTradeRepository` — сделки
- `PrismaSessionRepository` — сессии

**Реализуют интерфейсы из `ports/repositories/`**

---

## 💾 БАЗА ДАННЫХ

### Схема (`prisma/schema.prisma`)

**Модели:**

1. **User** — пользователи
   - `id`, `email`, `password`, `createdAt`, `updatedAt`

2. **Session** — сессии
   - `id`, `userId`, `tokenHash`, `expiresAt`, `createdAt`

3. **Account** — аккаунты (demo/real)
   - `id`, `userId`, `type`, `balance`, `currency`, `isActive`

4. **Trade** — сделки
   - `id`, `userId`, `accountId`, `direction`, `amount`, `entryPrice`, `exitPrice`, `payout`, `status`, `openedAt`, `expiresAt`, `closedAt`

5. **Candle** — **закрытые свечи (для графика)**
   - `id`, `symbol`, `timeframe`, `timestamp` (BigInt), `open`, `high`, `low`, `close`
   - **Уникальный индекс:** `[symbol, timeframe, timestamp]`
   - **Индекс для запросов:** `[symbol, timeframe, timestamp DESC]`

**Важно для графика:**

- Таблица `Candle` хранит **только закрытые свечи**
- Активные свечи хранятся в in-memory store
- `symbol` — это `engine.asset` (например, `"BTC/USD"`), не `instrumentId`
- `timestamp` — BigInt (миллисекунды с начала эпохи)
- `timeframe` — строка `'5s'`

**Запросы для графика:**

```sql
-- Последние N свечей
SELECT * FROM candles 
WHERE symbol = 'BTC/USD' AND timeframe = '5s'
ORDER BY timestamp DESC
LIMIT 100;

-- Свечи до времени (для панорамирования)
SELECT * FROM candles
WHERE symbol = 'BTC/USD' AND timeframe = '5s' AND timestamp < 1234567890
ORDER BY timestamp DESC
LIMIT 200;
```

---

## ⚙️ КОНФИГУРАЦИЯ

### `config/instruments.ts` — Конфигурация инструментов

**Структура:**

```typescript
interface InstrumentConfig {
  id: string;              // 'EURUSD', 'BTCUSD', ...
  base: string;            // 'EUR', 'BTC', ...
  quote: string;           // 'USD', ...
  digits: number;          // Точность отображения (5 для forex, 2 для crypto)
  engine: {
    asset: string;         // 'EUR/USD', 'BTC/USD', ...
    initialPrice: number;  // Начальная цена
    minPrice: number;     // Минимум
    maxPrice: number;     // Максимум
    volatility: number;     // Волатильность (0-1)
    tickInterval: number; // Интервал тиков (мс)
  }
}
```

**Доступные инструменты:**

- **Forex:** EURUSD, GBPUSD, USDCAD, USDCHF, AUDCAD, AUDCHF, CADJPY, EURJPY, GBPJPY, NZDUSD, NZDJPY, EURCHF, EURNZD, GBPAUD, CHFNOK, UAHUSD
- **Crypto:** BTCUSD, ETHUSD, SOLUSD, BNBUSD

**Функции:**

- `getInstrument(id)` — получить конфигурацию
- `getInstrumentOrDefault(id)` — получить или дефолтный
- `getInstrumentIds()` — список всех ID
- `getInstrumentIdBySymbol(symbol)` — найти ID по символу

**Важно:**

- `id` используется в API и WebSocket (`instrument` параметр)
- `engine.asset` используется в `CandleStore` (`symbol`)

---

### `config/env.ts` — Переменные окружения

**Требуемые переменные:**

- `PORT` — порт сервера (1-65535)
- `DATABASE_URL` — PostgreSQL connection string
- `NODE_ENV` — `development` | `production` | `test`

**Валидация:** Проверка наличия и корректности при старте.

---

## 🔄 ПОТОКИ ДАННЫХ

### Поток 1: Генерация цены и свечей

```
1. OtcPriceEngine (каждые 500мс)
   └─> Генерирует PriceTick
       ├─> Сохраняет в PriceStore (price:${instrumentId})
       └─> Эмитит price_tick через PriceEventBus

2. CandleEngine (подписан на price_tick)
   └─> Получает PriceTick
       ├─> Если нет активной свечи → открывает новую
       ├─> Если есть → обновляет (high/low/close)
       ├─> Сохраняет активную свечу в CandleStore (candle:active:${symbol})
       └─> Эмитит candle_opened / candle_updated

3. Интервал закрытия (каждые 5 секунд)
   └─> CandleEngine.closeCandle()
       ├─> Сохраняет закрытую свечу в PostgreSQL (CandleStore.addClosedCandle)
       └─> Эмитит candle_closed

4. WebSocket Bootstrap (подписан на события)
   └─> Получает события из PriceEventBus
       └─> Отправляет через WebSocketManager.broadcastToInstrument()
           └─> Только клиентам с client.instrument === instrumentId
```

---

### Поток 2: Запрос снапшота терминала

```
1. Клиент → GET /api/terminal/snapshot?instrument=EURUSD&timeframe=5s
   └─> TerminalController.getSnapshot()

2. TerminalSnapshotService.getSnapshot()
   └─> TerminalSnapshotAdapter.getSnapshot()
       ├─> UserRepository.findById() → БД
       ├─> AccountRepository.findByUserId() → БД
       ├─> AccountRepository.findActiveByUserId() → БД
       ├─> PriceEngineManager.getCurrentPrice() → PriceStore (in-memory)
       ├─> PriceEngineManager.getCandles() → CandleStore.getClosedCandles() → PostgreSQL
       ├─> TradeRepository.findByUserId() → БД
       └─> TimeService.now() → SystemClock

3. Формирование ответа
   └─> Возврат TerminalSnapshot
```

---

### Поток 3: Запрос исторических свечей (панорамирование)

```
1. Клиент → GET /api/quotes/candles?instrument=EURUSD&timeframe=5s&to=1234567890&limit=200
   └─> TerminalController.getCandles()

2. PriceEngineManager.getCandlesBefore()
   └─> CandleStore.getClosedCandlesBefore()
       └─> Prisma запрос:
           SELECT * FROM candles
           WHERE symbol = 'EUR/USD' AND timeframe = '5s' AND timestamp < 1234567890
           ORDER BY timestamp DESC
           LIMIT 200

3. Преобразование в формат с startTime/endTime
   └─> Возврат { items: [...] }
```

---

### Поток 4: WebSocket подписка и события

```
1. Подключение
   Клиент → WS /ws
   └─> Аутентификация (cookie)
   └─> Регистрация в WebSocketManager

2. Подписка на инструмент
   Клиент → { type: 'subscribe', instrument: 'EURUSD' }
   └─> client.instrument = 'EURUSD'

3. Получение событий
   PriceEventBus (EURUSD) → websocket.bootstrap.ts
   └─> WebSocketManager.broadcastToInstrument('EURUSD', event)
       └─> Фильтрация: только клиенты с client.instrument === 'EURUSD'
           └─> client.send(event)

4. События, которые получает клиент:
   - price:update (каждые ~500мс)
   - candle:update (при каждом тике в активной свече)
   - candle:close (каждые 5 секунд)
   - server:time (каждую секунду, всем клиентам)
```

---

## 📊 КЛЮЧЕВЫЕ КОНЦЕПЦИИ

### Инструменты (Instruments)

**Два идентификатора:**

1. **`instrumentId`** (например, `"EURUSD"`):
   - Используется в API (`?instrument=EURUSD`)
   - Используется в WebSocket (`subscribe` сообщение)
   - Ключ в `PriceEngineManager.engines`

2. **`symbol`** или **`engine.asset`** (например, `"EUR/USD"`):
   - Используется в `CandleStore` (ключ для БД)
   - Используется в `PriceEngine` (конфигурация)

**Преобразование:**

```typescript
const config = getInstrumentOrDefault('EURUSD');
const symbol = config.engine.asset; // 'EUR/USD'
```

---

### Таймфрейм

**Текущее состояние:** Только `5s` (базовый таймфрейм).

**Архитектура:**

- `CandleEngine` генерирует только 5s свечи
- `TimeframeAggregator` не используется (пустой массив `aggregationTimeframes`)
- Все запросы используют `timeframe: '5s'`

**Если нужно добавить другие таймфреймы:**

1. Обновить `Timeframe` тип в `PriceTypes.ts`
2. Обновить `TimeframeAggregator` для агрегации
3. Обновить `CANDLE_CONFIG.aggregationTimeframes` в `PriceEngineManager.ts`
4. Обновить API схемы

---

### Хранение данных

**In-Memory (PriceStore, CandleStore для активных):**

- Текущая цена: `price:${instrumentId}`
- Активная свеча: `candle:active:${symbol}`
- Данные теряются при перезапуске сервера

**PostgreSQL (CandleStore для закрытых):**

- Таблица `Candle`
- Хранятся все закрытые свечи
- Используются для истории графика
- Данные персистентны

---

### Event-Driven Architecture

**Центральная система:** `PriceEventBus`

**Паттерн:** Pub/Sub

**Преимущества:**

- Декoupling между компонентами
- Легко добавить новых подписчиков (например, WebSocket)
- Тестируемость

**Поток событий:**

```
OtcPriceEngine → PriceEventBus → CandleEngine
                              → WebSocket Bootstrap
                              → (будущие подписчики)
```

---

## 🎯 ИТОГОВАЯ СХЕМА ДЛЯ ГРАФИКА

### Что нужно для построения графика на фронтенде:

1. **Начальная загрузка:**
   ```
   GET /api/terminal/snapshot?instrument=EURUSD&timeframe=5s
   → Получаем: последние 100 свечей, текущую цену, активную свечу
   ```

2. **WebSocket подключение:**
   ```
   WS /ws → subscribe → { type: 'subscribe', instrument: 'EURUSD' }
   → Получаем события в реальном времени:
     - price:update (обновление цены)
     - candle:update (обновление активной свечи)
     - candle:close (закрытие свечи, новая активная)
     - server:time (синхронизация времени)
   ```

3. **Панорамирование (загрузка истории):**
   ```
   GET /api/quotes/candles?instrument=EURUSD&timeframe=5s&to=1234567890&limit=200
   → Получаем свечи до указанного времени
   ```

### Формат данных свечи:

```typescript
// Из API
{
  open: number,
  high: number,
  low: number,
  close: number,
  startTime: number,  // timestamp начала (округлено до 5s)
  endTime: number     // timestamp конца (startTime + 5000)
}

// Из WebSocket (candle:update / candle:close)
{
  instrument: 'EURUSD',
  type: 'candle:update' | 'candle:close',
  data: {
    timeframe: '5s',
    candle: {
      open: number,
      high: number,
      low: number,
      close: number,
      timestamp: number,  // startTime
      timeframe: '5s'
    }
  }
}
```

### Формат данных цены:

```typescript
// Из WebSocket (price:update)
{
  instrument: 'EURUSD',
  type: 'price:update',
  data: {
    asset: 'EUR/USD',
    price: number,
    timestamp: number
  }
}
```

---

## ✅ ЧЕКЛИСТ ДЛЯ ИНТЕГРАЦИИ ГРАФИКА

- [ ] Подключение к WebSocket (`/ws`)
- [ ] Аутентификация (cookie/session)
- [ ] Подписка на инструмент (`subscribe`)
- [ ] Обработка событий:
  - [ ] `price:update` → обновление линии текущей цены
  - [ ] `candle:update` → обновление активной свечи
  - [ ] `candle:close` → закрытие свечи, открытие новой
  - [ ] `server:time` → синхронизация времени
- [ ] Загрузка снапшота при старте
- [ ] Загрузка истории при панорамировании
- [ ] Обработка смены инструмента (отписка/подписка)

---

## 📝 ЗАМЕТКИ

1. **Только 5s таймфрейм:** Все остальные таймфреймы отключены
2. **In-memory store:** Это не Redis, а простой Map (данные теряются при перезапуске)
3. **Активные свечи:** Хранятся в памяти, закрытые — в PostgreSQL
4. **Подписка на инструмент:** Клиент получает события только для подписанного инструмента
5. **Символы:** `instrumentId` (EURUSD) ≠ `symbol` (EUR/USD) — используйте правильный в нужном месте

---

**Документация создана:** 2026-01-29  
**Версия бекенда:** Только 5s таймфрейм  
**Архитектура:** Clean Architecture + Event-Driven
