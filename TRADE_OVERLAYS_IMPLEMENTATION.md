# Trade Overlays Implementation

## Обзор

Trade Overlays — это система визуализации открытых сделок на графике. Горизонтальная линия показывает цену входа сделки, точка входа, и индикатор текущей прибыли/убытка.

---

## Архитектура

### Frontend Flow

```
User opens trade
    ↓
POST /api/trades/open
    ↓
Backend returns Trade DTO
    ↓
addTradeOverlayFromDTO() в useChart.ts
    ↓
Добавление в tradesRef.current
    ↓
getTrades() передается в useRenderLoop
    ↓
renderTrades() отрисовывает на canvas
```

### Backend Flow

```
POST /api/trades/open { instrument: "AUDCHF" }
    ↓
TradesController.openTrade()
    ↓
Валидация instrument
    ↓
TradeService.openTrade({ instrument })
    ↓
priceProvider.getCurrentPrice(input.instrument) ← ✅ Используем переданный instrument
    ↓
Создание TradeEntity с правильной entryPrice
    ↓
Возврат TradeDTO с entryPrice.toString()
```

---

## Компоненты

### 1. Frontend: `useChart.ts`

**Расположение:** `frontend/components/chart/useChart.ts`

**Ответственность:**
- Хранение сделок в `tradesRef`
- Добавление сделок через `addTradeOverlayFromDTO()`
- Предоставление `getTrades()` для рендеринга

**Ключевой код:**

```typescript
// Хранение сделок (ref-based, не влияет на рендер)
const tradesRef = useRef<Array<{
  id: string;
  direction: 'CALL' | 'PUT';
  entryPrice: number;
  openedAt: number;
  expiresAt: number;
  amount?: number;
}>>([]);

const addTradeOverlayFromDTO = (trade: {
  id: string;
  direction: 'CALL' | 'PUT';
  entryPrice: string; // Приходит как строка с сервера
  openedAt: string;
  expiresAt: string;
  amount?: string;
}): void => {
  // ✅ Просто используем entryPrice как есть - бэкенд теперь всегда правильный
  const entryPrice = parseFloat(trade.entryPrice);
  
  tradesRef.current = [
    ...tradesRef.current.filter(t => t.id !== trade.id),
    {
      id: trade.id,
      direction: trade.direction,
      entryPrice, // Цена всегда корректная от бэкенда
      openedAt: new Date(trade.openedAt).getTime(),
      expiresAt: new Date(trade.expiresAt).getTime(),
      amount: trade.amount ? parseFloat(trade.amount) : undefined,
    },
  ];
};
```

**Исправление хардкода:**
- ✅ Бэкенд теперь использует переданный `instrument` вместо хардкода `'BTC/USD'`
- ✅ Цена входа всегда корректная для текущего инструмента
- ✅ Frontend больше не нужен fallback - просто использует данные от бэкенда

---

### 2. Frontend: `renderTrades.ts`

**Расположение:** `frontend/components/chart/internal/trades/renderTrades.ts`

**Ответственность:**
- Отрисовка горизонтальной линии по цене входа
- Отрисовка точки входа (зеленый/красный кружок)
- Отрисовка индикатора прибыли/убытка

**Ключевые функции:**

#### `priceToY()` — Конвертация цены в Y координату

```typescript
function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  
  // Нормализуем цену относительно диапазона
  const normalizedPrice = (price - viewport.priceMin) / priceRange;
  
  // Y координата: 0 вверху, height внизу
  // Инвертируем, так как в canvas Y растет вниз
  const y = height - (normalizedPrice * height);
  
  return y;
}
```

#### `timeToX()` — Конвертация времени в X координату

```typescript
function timeToX(time: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}
```

#### Основная логика отрисовки:

```typescript
export function renderTrades({
  ctx,
  trades,
  viewport,
  width,
  height,
  digits = 5,
  currentPrice, // Текущая цена для расчета прибыли
}: RenderTradesParams): void {
  // Фильтруем видимые сделки
  const visibleTrades = trades.filter((trade) => {
    const isOpen = trade.expiresAt > now;
    const timeVisible = /* проверка пересечения с viewport */;
    return isOpen || timeVisible;
  });

  for (const trade of visibleTrades) {
    // 1. Вычисляем координаты
    const openX = timeToX(trade.openedAt, viewport, width);
    const expireX = timeToX(trade.expiresAt, viewport, width);
    const entryY = priceToY(trade.entryPrice, viewport, height);
    
    // 2. Рисуем горизонтальную линию (синяя)
    ctx.strokeStyle = '#3347ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(drawStartX, drawY);
    ctx.lineTo(drawEndX, drawY);
    ctx.stroke();
    
    // 3. Рисуем точку входа (зеленый/красный кружок с белой обводкой)
    ctx.fillStyle = isCall ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(pointX, pointYFinal, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    
    // 4. Если сделка открыта, рисуем индикатор прибыли
    if (currentPrice != null && now < trade.expiresAt) {
      const isWin = isCall ? currentPrice > trade.entryPrice : currentPrice < trade.entryPrice;
      // Рисуем кружок с треугольником и текстом прибыли
    }
  }
}
```

**Визуальные элементы:**

1. **Горизонтальная линия:**
   - Цвет: `#3347ff` (синий)
   - Толщина: 2px
   - От точки открытия до текущего времени (или экспирации)

2. **Точка входа:**
   - Зеленый кружок для CALL (`#22c55e`)
   - Красный кружок для PUT (`#ef4444`)
   - Белая обводка (2px)
   - Радиус: 6px

3. **Индикатор прибыли:**
   - Зеленый/красный кружок с треугольником (вверх/вниз)
   - Текст прибыли в рублях (если есть `amount`)
   - Позиция: справа от текущей позиции линии

---

### 3. Frontend: `useRenderLoop.ts`

**Расположение:** `frontend/components/chart/internal/useRenderLoop.ts`

**Ответственность:**
- Вызов `renderTrades()` в каждом кадре рендеринга
- Передача текущей цены из `liveCandle` для расчета прибыли

**Ключевой код:**

```typescript
// FLOW T-OVERLAY: Рисуем trades (сделки) - только видимые
if (getTrades) {
  const allTrades = getTrades();
  const visibleTradeIds = visibleIds || new Set<string>();
  const trades = visibleIds
    ? allTrades.filter((t) => visibleTradeIds.has(t.id))
    : allTrades;
  
  // Получаем текущую цену из liveCandle для расчета прибыли
  const liveCandle = animatedCandle || getRenderLiveCandle();
  const currentPrice = liveCandle?.close;
  
  if (trades.length > 0) {
    renderTrades({
      ctx,
      trades,
      viewport,
      width,
      height: mainHeight,
      digits,
      currentPrice, // Передаем для расчета прибыли
    });
  }
}
```

---

### 4. Frontend: `terminal/page.tsx`

**Расположение:** `frontend/app/terminal/page.tsx`

**Ответственность:**
- Обработка клика на кнопку "Выше"/"Ниже"
- Отправка запроса на открытие сделки
- Добавление сделки на график через `addTradeOverlayFromDTO()`

**Ключевой код:**

```typescript
// Кнопка "Выше" (CALL)
<button onClick={async () => {
  const res = await api('/api/trades/open', {
    method: 'POST',
    body: JSON.stringify({
      accountId,
      direction: 'CALL',
      amount: amountNum,
      expirationSeconds: expiration,
    }),
  });

  // FLOW T-OVERLAY: сразу добавляем overlay по Trade DTO
  (candleChartRef.current as any)?.addTradeOverlayFromDTO(res.trade);
}}>
  Выше
</button>
```

---

## Backend: Исправление хардкода

### ✅ ИСПРАВЛЕНО

**Было (проблема):**

**Файл:** `backend/src/domain/trades/TradeService.ts`

```typescript
const priceData = await this.priceProvider.getCurrentPrice('BTC/USD'); // ❌ ХАРДКОД
```

**Проблема:**
- Всегда использовался хардкод `'BTC/USD'`
- Не учитывался текущий инструмент пользователя
- Если пользователь торгует `AUDCHF`, цена входа была ~48000 (BTC) вместо ~1.36 (AUDCHF)

**Стало (исправлено):**

1. **Обновлен интерфейс `OpenTradeInput`:**

```typescript
// backend/src/domain/trades/TradeTypes.ts
export interface OpenTradeInput {
  userId: string;
  accountId: string;
  direction: TradeDirection;
  amount: number;
  expirationSeconds: number;
  instrument: string; // ✅ Добавлено
}
```

2. **Обновлен `TradesController`:**

```typescript
// backend/src/modules/trades/trades.controller.ts
async openTrade(request: FastifyRequest<{
  Body: {
    accountId: string;
    direction: 'CALL' | 'PUT';
    amount: number;
    expirationSeconds: number;
    instrument: string; // ✅ Добавлено
  };
}>) {
  const { accountId, direction, amount, expirationSeconds, instrument } = request.body;
  
  // Валидация instrument
  if (!instrument || typeof instrument !== 'string') {
    return reply.status(400).send({
      error: 'Invalid instrument',
      message: 'Instrument is required',
    });
  }

  const trade = await this.tradeService.openTrade({
    userId,
    accountId,
    direction: direction === 'CALL' ? TradeDirection.CALL : TradeDirection.PUT,
    amount,
    expirationSeconds,
    instrument, // ✅ Передаем в service
  });
}
```

3. **Исправлен `TradeService`:**

```typescript
// backend/src/domain/trades/TradeService.ts
// Get current price for the specified instrument
const priceData = await this.priceProvider.getCurrentPrice(input.instrument); // ✅ Используем переданный instrument
if (!priceData) {
  throw new Error(`Price service unavailable for instrument: ${input.instrument}`);
}
```

4. **Обновлен Frontend:**

```typescript
// frontend/app/terminal/page.tsx
await api('/api/trades/open', {
  method: 'POST',
  body: JSON.stringify({
    accountId,
    direction: 'CALL',
    amount: amountNum,
    expirationSeconds: expiration,
    instrument: instrument, // ✅ Передаем текущий инструмент
  }),
});
```

5. **Удален fallback на Frontend:**

```typescript
// frontend/components/chart/useChart.ts
// ❌ УДАЛЕНО: Весь блок с проверкой priceRatio и fallback на currentPrice
// Теперь просто используем entryPrice как есть:
const entryPrice = parseFloat(trade.entryPrice);
```

**Результат:**
- ✅ Цена входа всегда корректная для текущего инструмента
- ✅ Trade overlays детерминированы
- ✅ Нет "магического исправления" на фронтенде
- ✅ Backend = источник истины
- ✅ Архитектура как у нормального брокера

---

## Структура данных

### Trade DTO (Backend → Frontend)

```typescript
{
  id: string;
  accountId: string;
  direction: 'CALL' | 'PUT';
  instrument: string; // ✅ Trading instrument (e.g., 'AUDCHF', 'BTCUSD')
  amount: string; // Строка для точности
  entryPrice: string; // ✅ Всегда правильная для текущего инструмента
  exitPrice: string | null;
  payout: string;
  status: 'OPEN' | 'WIN' | 'LOSS';
  openedAt: string; // ISO string
  expiresAt: string; // ISO string
  closedAt: string | null;
}
```
```

### Trade в Frontend (tradesRef)

```typescript
{
  id: string;
  direction: 'CALL' | 'PUT';
  entryPrice: number; // ✅ Всегда корректная цена от бэкенда
  openedAt: number; // Timestamp в миллисекундах
  expiresAt: number; // Timestamp в миллисекундах
  amount?: number; // Для расчета прибыли
}
```

---

## Фильтрация видимых сделок

Сделка считается видимой, если:

1. **Она еще открыта** (`expiresAt > now`), ИЛИ
2. **Она пересекается с viewport по времени:**
   - Точка открытия в viewport
   - Точка экспирации в viewport
   - Сделка охватывает весь viewport

```typescript
const visibleTrades = trades.filter((trade) => {
  const isOpen = trade.expiresAt > now;
  const timeVisible =
    (trade.openedAt >= viewport.timeStart && trade.openedAt <= viewport.timeEnd) ||
    (trade.expiresAt >= viewport.timeStart && trade.expiresAt <= viewport.timeEnd) ||
    (trade.openedAt <= viewport.timeStart && trade.expiresAt >= viewport.timeEnd);
  
  return isOpen || timeVisible;
});
```

---

## Расчет прибыли

### Если есть `amount`:

```typescript
const priceDiff = isCall 
  ? (currentPrice - trade.entryPrice) / trade.entryPrice 
  : (trade.entryPrice - currentPrice) / trade.entryPrice;
const profit = priceDiff * trade.amount;
profitText = `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} ₽`;
```

### Если нет `amount`:

```typescript
const priceDiff = Math.abs(currentPrice - trade.entryPrice);
profitText = `${priceDiff.toFixed(digits)}`;
```

---

## Визуальные детали

### Цвета

- **CALL (Выше):** Зеленый (`#22c55e`)
- **PUT (Ниже):** Красный (`#ef4444`)
- **Горизонтальная линия:** Синий (`#3347ff`)
- **Точка входа:** Зеленый/Красный с белой обводкой
- **Индикатор прибыли:** Зеленый/Красный в зависимости от результата

### Размеры

- **Толщина линии:** 2px
- **Радиус точки входа:** 6px
- **Толщина обводки точки:** 2px
- **Радиус индикатора прибыли:** 8px
- **Размер текста прибыли:** 11px

---

## Проблемы и решения

### ✅ Проблема 1: Цена входа неправильная — ИСПРАВЛЕНО

**Причина:** Хардкод `'BTC/USD'` в `TradeService.ts`

**Решение:** 
- ✅ Добавлен `instrument` в `OpenTradeInput`
- ✅ `TradesController` принимает и валидирует `instrument`
- ✅ `TradeService` использует `input.instrument` вместо хардкода
- ✅ Frontend передает текущий инструмент при открытии сделки
- ✅ Удален fallback на фронтенде

### ✅ Проблема 2: Закрытие сделок по неправильной цене — ИСПРАВЛЕНО (КРИТИЧНО!)

**Причина:** Хардкод `'BTC/USD'` в `TradeClosingService.ts`

**Проблема:**
- Все сделки закрывались по цене BTC/USD, независимо от инструмента открытия
- WIN/LOSS рассчитывался неправильно
- Это фатальный баг для брокера

**Решение:**
- ✅ Добавлено поле `instrument` в Trade entity (Prisma schema)
- ✅ Добавлено поле `instrument` в Trade interface и TradeEntity
- ✅ `TradeService.openTrade()` сохраняет `instrument` в БД
- ✅ `TradeClosingService` использует `tradeData.instrument` вместо хардкода
- ✅ `PrismaTradeRepository` сохраняет и читает `instrument`
- ✅ Создана миграция БД с default значением для существующих записей

**Код исправления:**

```typescript
// TradeClosingService.ts
// ❌ БЫЛО:
const priceData = await this.priceProvider.getCurrentPrice('BTC/USD');

// ✅ СТАЛО:
const priceData = await this.priceProvider.getCurrentPrice(tradeData.instrument);
```

**Результат:**
- ✅ Сделки закрываются по правильной цене для своего инструмента
- ✅ WIN/LOSS рассчитывается корректно
- ✅ Payouts правильные
- ✅ Архитектура чистая и масштабируемая

### Проблема 2: Линия рисуется сверху

**Причина:** Цена входа вне диапазона `viewport.priceMin - viewport.priceMax`

**Решение:** Использование правильного расчета Y координаты через `priceToY()`

### Проблема 3: Сделки не видны после закрытия

**Причина:** Фильтрация по времени может скрывать закрытые сделки

**Решение:** Показываем открытые сделки всегда, закрытые — только если пересекаются с viewport

---

## TODO

- [x] ✅ Исправить хардкод `'BTC/USD'` в `TradeService.ts`
- [x] ✅ Передавать текущий инструмент при открытии сделки
- [x] ✅ Убрать временное решение с fallback на фронтенде
- [x] ✅ Добавить поле `instrument` в Trade entity и схему БД
- [x] ✅ Исправить `TradeClosingService` для использования правильного инструмента
- [ ] Добавить тесты для `renderTrades()`
- [ ] Оптимизировать отрисовку (не перерисовывать если ничего не изменилось)

---

## Связанные файлы

### Frontend
- `frontend/components/chart/useChart.ts` — Хранение сделок и добавление
- `frontend/components/chart/internal/trades/renderTrades.ts` — Отрисовка
- `frontend/components/chart/internal/useRenderLoop.ts` — Интеграция в render loop
- `frontend/app/terminal/page.tsx` — UI для открытия сделок

### Backend
- `backend/src/modules/trades/trades.controller.ts` — HTTP контроллер
- `backend/src/domain/trades/TradeService.ts` — ✅ Использует `input.instrument`
- `backend/src/domain/trades/TradeEntity.ts` — Доменная модель (с `instrument`)
- `backend/src/domain/trades/TradeClosingService.ts` — ✅ Использует `tradeData.instrument`
- `backend/src/ports/repositories/TradeRepository.ts` — Репозиторий
- `backend/src/infrastructure/prisma/PrismaTradeRepository.ts` — ✅ Сохраняет и читает `instrument`
- `backend/prisma/schema.prisma` — ✅ Поле `instrument` в модели Trade

---

## Пример использования

1. Пользователь выбирает инструмент (например, `AUDCHF`)
2. Пользователь вводит сумму и время экспирации
3. Пользователь нажимает "Выше" или "Ниже"
4. Frontend отправляет `POST /api/trades/open` с `instrument: 'AUDCHF'`
5. Backend получает `instrument` и использует его для получения цены
6. Backend создает сделку с правильной ценой входа для `AUDCHF`
7. Backend возвращает Trade DTO с корректной `entryPrice`
8. Frontend получает Trade DTO и вызывает `addTradeOverlayFromDTO()`
9. Сделка добавляется в `tradesRef.current` с правильной ценой
10. В каждом кадре `renderTrades()` отрисовывает видимые сделки
11. Горизонтальная линия появляется на графике на правильном уровне цены входа

---

## Логирование

Для отладки добавлено логирование:

- `[useChart] addTradeOverlayFromDTO called with:` — Получение Trade DTO
- `[renderTrades] Rendering trades:` — Начало отрисовки
- `[renderTrades] Price calculation:` — Расчет координат
- `[priceToY]` — Конвертация цены в Y координату

Все логи можно увидеть в консоли браузера (F12).

---

## Критические исправления

### ✅ Исправление 1: Хардкод при открытии сделки

**Проблема:** `TradeService.openTrade()` всегда использовал `'BTC/USD'`

**Решение:** Передача `instrument` из frontend → controller → service

### ✅ Исправление 2: Хардкод при закрытии сделки (КРИТИЧНО!)

**Проблема:** `TradeClosingService.closeExpiredTrades()` всегда использовал `'BTC/USD'`

**Последствия:**
- Все сделки закрывались по неправильной цене
- WIN/LOSS рассчитывался неправильно
- Это фатальный баг для брокера

**Решение:**
- Добавлено поле `instrument` в Trade entity (хранится в БД)
- `TradeClosingService` использует `tradeData.instrument` для получения цены закрытия
- Каждая сделка закрывается по цене своего инструмента

**Миграция БД:**
- Добавлена колонка `instrument` в таблицу `trades`
- Существующие записи получили default значение `'BTCUSD'`
- Добавлен индекс на `instrument` для производительности

**Результат:**
- ✅ Открытие и закрытие сделок по одному и тому же инструменту
- ✅ Корректный расчет WIN/LOSS
- ✅ Правильные payouts
- ✅ Чистая архитектура без хардкодов
