# Архитектура линейного графика (Linear Tick Chart)

## 📋 Содержание

1. [Концепция](#концепция)
2. [Backend архитектура](#backend-архитектура)
3. [Frontend архитектура](#frontend-архитектура)
4. [Жизненный цикл данных](#жизненный-цикл-данных)
5. [Детали реализации](#детали-реализации)

---

## Концепция

### Что такое Linear Tick Chart?

**Линейный график** — это визуализация цены в виде непрерывной линии, построенной на основе **price points** (точек цены).

### Ключевые отличия от свечного графика:

| Параметр | Свечной график | Линейный график |
|----------|---------------|------------------|
| **Данные** | OHLC свечи (open, high, low, close) | Price points (time, price) |
| **Частота** | 1 свеча за таймфрейм (5s, 1m, 5m...) | 1 точка в секунду |
| **Хранение** | Таблица `candles` | Таблица `price_points` |
| **Viewport** | Индекс свечей | Временное окно (timeStart, timeEnd) |
| **Live обновление** | Закрытие свечи | Анимация на каждый тик + точка раз в секунду |

### Почему Price Points, а не тики?

1. **Производительность**: Тики приходят слишком часто (5-10 раз в секунду), что создает огромную нагрузку на БД и сеть
2. **Визуальная разница**: Глаз человека не видит разницу между 5 тиками в секунду и 1 точкой в секунду
3. **Практика**: Так делают реальные торговые терминалы (Quotex, Pocket Option)

### Структура Price Point

```typescript
type PricePoint = {
  time: number;   // timestamp (ms), начало секунды: Math.floor(timestamp / 1000) * 1000
  price: number;  // цена на момент начала секунды
};
```

**Важно**: `time` всегда округляется до начала секунды (например, `1769731845000` вместо `1769731845123`).

---

## Backend архитектура

### 1. Модель данных (Prisma Schema)

**Файл**: `backend/prisma/schema.prisma`

```prisma
model PricePoint {
  id        String  @id @default(cuid())
  symbol    String  // Инструмент (например, "BTC/USD", "AUD/CHF")
  timestamp BigInt  // Начало секунды (ms), Math.floor(time / 1000) * 1000
  price     Decimal // Цена на момент начала секунды

  @@unique([symbol, timestamp])  // Защита от дублей
  @@index([symbol, timestamp(sort: Desc)])  // Индекс для быстрого поиска истории
  @@map("price_points")
}
```

**Особенности**:
- `timestamp` хранится как `BigInt` (для больших временных меток)
- Уникальность по `(symbol, timestamp)` предотвращает дубликаты
- Индекс по `timestamp DESC` оптимизирует запросы истории

### 2. PricePointWriter — запись точек в БД

**Файл**: `backend/src/prices/PricePointWriter.ts`

**Ответственность**: Записывать **1 price point в секунду** для каждого инструмента.

#### Алгоритм работы:

```typescript
class PricePointWriter {
  private lastSecond = new Map<string, number>(); // Кеш последней секунды

  async handleTick(symbol: string, price: number, time: number) {
    // 1. Округляем до начала секунды
    const second = Math.floor(time / 1000) * 1000;
    
    // 2. Проверяем, не та же ли секунда
    const last = this.lastSecond.get(symbol);
    if (last === second) return; // Пропускаем, если та же секунда
    
    // 3. Обновляем кеш
    this.lastSecond.set(symbol, second);
    
    // 4. Upsert в БД (обновить если есть, создать если нет)
    await prisma.pricePoint.upsert({
      where: { symbol_timestamp: { symbol, timestamp: BigInt(second) } },
      update: { price },
      create: { symbol, timestamp: BigInt(second), price },
    });
  }
}
```

**Важно**:
- Используется `upsert` для защиты от дублей (если два тика пришли в одну секунду)
- Кеш `lastSecond` предотвращает множественные записи в одну секунду
- Ошибки логируются, но не прерывают работу (graceful degradation)

### 3. Интеграция в PriceEngineManager

**Файл**: `backend/src/prices/PriceEngineManager.ts`

```typescript
export class PriceEngineManager {
  private pricePointWriter = new PricePointWriter();

  start(): void {
    for (const [instrumentId, config] of Object.entries(INSTRUMENTS)) {
      const eventBus = new PriceEventBus();
      const priceEngine = new OtcPriceEngine(...);
      
      // Подписываемся на price_tick события
      eventBus.on('price_tick', (event) => {
        if (event.type === 'price_tick') {
          const tick = event.data as PriceTick;
          // Записываем price point (асинхронно, не блокируем)
          this.pricePointWriter.handleTick(
            symbol, 
            tick.price, 
            tick.timestamp
          ).catch((error) => {
            logger.error(`Failed to write price point:`, error);
          });
        }
      });
    }
  }
}
```

**Поток данных**:
```
OtcPriceEngine → price_tick event → PricePointWriter → PostgreSQL (price_points)
```

### 4. API Endpoints

**Файл**: `backend/src/modules/linechart/linechart.controller.ts`

#### 4.1. GET `/api/line/snapshot`

**Назначение**: Получить начальный snapshot для загрузки графика (~10 минут данных).

**Параметры**:
- `symbol` (query, опционально): Инструмент (например, `AUDCHF`)

**Ответ**:
```typescript
{
  points: Array<{ time: number; price: number }>;  // ~600 точек (10 минут)
  currentPrice: number;  // Текущая цена из PriceEngineManager
  serverTime: number;    // Серверное время (timestamp)
}
```

**Логика**:
1. Получаем последние 600 точек из БД (`orderBy: { timestamp: 'desc' }, take: 600`)
2. Переворачиваем массив для хронологического порядка (старые → новые)
3. Получаем текущую цену из `PriceEngineManager` (если нет в БД)
4. Возвращаем snapshot

**Обработка ошибок**:
- Если таблица `price_points` не существует → возвращаем `points: []`
- Если модель `PricePoint` недоступна → возвращаем пустой snapshot с текущей ценой

#### 4.2. GET `/api/line/history`

**Назначение**: Получить исторические точки для infinite scroll.

**Параметры**:
- `symbol` (query, опционально): Инструмент
- `to` (query, обязательный): Timestamp до которого загружать (ms)
- `limit` (query, опционально): Количество точек (по умолчанию 300 = ~5 минут)

**Ответ**:
```typescript
{
  points: Array<{ time: number; price: number }>;  // Точки до указанного времени
}
```

**Логика**:
1. Получаем точки где `timestamp < to` (`orderBy: { timestamp: 'desc' }, take: limit`)
2. Переворачиваем массив для хронологического порядка
3. Возвращаем точки

**Использование**: Когда пользователь скроллит влево и viewport приближается к левому краю данных.

---

## Frontend архитектура

### 1. Хранилище данных (useLinePointStore)

**Файл**: `frontend/components/chart/line/useLinePointStore.ts`

**Ответственность**: Хранить price points в памяти, управлять добавлением/удалением.

```typescript
export function useLinePointStore() {
  const pointsRef = useRef<PricePoint[]>([]);
  const MAX_POINTS = 3000; // Максимум точек в памяти (~50 минут)

  // Добавить точку в конец (для live обновлений)
  function push(point: PricePoint): void {
    pointsRef.current.push(point);
    // Удаляем старые точки слева, если превышен лимит
    if (pointsRef.current.length > MAX_POINTS) {
      pointsRef.current.splice(0, pointsRef.current.length - MAX_POINTS);
    }
  }

  // Добавить точки в конец (для snapshot)
  function appendMany(points: PricePoint[]): void {
    pointsRef.current.push(...points);
    // Ограничиваем размер
    if (pointsRef.current.length > MAX_POINTS) {
      pointsRef.current.splice(0, pointsRef.current.length - MAX_POINTS);
    }
  }

  // Добавить точки в начало (для infinite scroll истории)
  function prepend(points: PricePoint[]): void {
    pointsRef.current.unshift(...points);
    // Удаляем новые точки справа, если превышен лимит
    if (pointsRef.current.length > MAX_POINTS) {
      pointsRef.current.splice(MAX_POINTS);
    }
  }

  // Получить все точки
  function getAll(): PricePoint[] {
    return pointsRef.current;
  }

  // Получить первую точку (самую старую)
  function getFirst(): PricePoint | null {
    return pointsRef.current[0] ?? null;
  }

  // Получить последнюю точку (самую новую)
  function getLast(): PricePoint | null {
    return pointsRef.current[pointsRef.current.length - 1] ?? null;
  }

  // Очистить все точки
  function reset(): void {
    pointsRef.current = [];
  }
}
```

**Особенности**:
- Использует `useRef` (не `useState`) для избежания лишних ре-рендеров
- Автоматически ограничивает размер массива (`MAX_POINTS = 3000`)
- Поддерживает `prepend` для infinite scroll (добавление истории в начало)

### 2. Viewport (useLineViewport)

**Файл**: `frontend/components/chart/line/useLineViewport.ts`

**Ответственность**: Управлять временным окном графика (что видно на экране).

```typescript
type LineViewport = {
  timeStart: number;  // Начало временного окна (ms)
  timeEnd: number;    // Конец временного окна (ms)
  autoFollow: boolean; // Автоматически следовать за новыми данными
};

export function useLineViewport() {
  const viewportRef = useRef<LineViewport>({
    timeEnd: Date.now(),
    timeStart: Date.now() - 60_000, // 60 секунд по умолчанию
    autoFollow: true,
  });

  // Следовать за текущим временем (если autoFollow включен)
  function followNow(now: number): void {
    if (!viewportRef.current.autoFollow) return;
    const window = viewportRef.current.timeEnd - viewportRef.current.timeStart;
    viewportRef.current.timeEnd = now;
    viewportRef.current.timeStart = now - window;
  }

  // Zoom: изменить ширину временного окна
  function zoom(factor: number): void {
    const vp = viewportRef.current;
    const center = (vp.timeStart + vp.timeEnd) / 2;
    const half = (vp.timeEnd - vp.timeStart) / 2 / factor;
    vp.timeStart = center - half;
    vp.timeEnd = center + half;
    vp.autoFollow = false; // После zoom отключаем auto-follow
  }

  // Pan: сдвинуть окно влево/вправо
  function pan(deltaMs: number): void {
    viewportRef.current.autoFollow = false;
    viewportRef.current.timeStart += deltaMs;
    viewportRef.current.timeEnd += deltaMs;
  }

  // Установить временное окно вручную (для snapshot)
  function setWindow(timeStart: number, timeEnd: number): void {
    viewportRef.current = {
      timeStart,
      timeEnd,
      autoFollow: false,
    };
  }
}
```

**Особенности**:
- Viewport основан на времени, а не на индексах (в отличие от свечного графика)
- `autoFollow` автоматически сдвигает окно вправо при новых данных
- После `zoom` или `pan` `autoFollow` отключается (пользователь взял управление)

### 3. Live обновления (useLineData)

**Файл**: `frontend/components/chart/line/useLineData.ts`

**Ответственность**: Обрабатывать обновления цены из WebSocket, разделять анимацию и данные.

```typescript
export function useLineData({ pointStore, viewport, setAnimatedPrice }) {
  const lastSecondRef = useRef<number | null>(null);

  const onPriceUpdate = useCallback((price: number, timestamp: number) => {
    // 1. АНИМАЦИЯ: Обновляем на каждый тик (для плавности визуально)
    setAnimatedPrice?.(price);

    // 2. ДАННЫЕ: Записываем точку только раз в секунду
    const second = Math.floor(timestamp / 1000) * 1000;
    const lastSecond = lastSecondRef.current;

    if (lastSecond !== second) {
      // Новая секунда — записываем точку
      pointStore.push({ time: second, price });
      lastSecondRef.current = second;

      // Обновляем viewport (auto-follow за временем)
      viewport.followNow(second);
    }
  }, [pointStore, viewport, setAnimatedPrice]);
}
```

**Ключевая идея**: Разделение ответственности
- **Анимация** (каждый тик): Для плавного визуального движения линии
- **Данные** (раз в секунду): Для хранения и истории

### 4. Главный хук (useLineChart)

**Файл**: `frontend/components/chart/line/useLineChart.ts`

**Ответственность**: Оркестрировать все компоненты (store, viewport, data, rendering).

#### Основные части:

1. **Инициализация из snapshot**:
```typescript
function initializeFromSnapshot(snapshot: {
  points: Array<{ time: number; price: number }>;
  currentPrice: number;
  serverTime: number;
}) {
  // 1. Очищаем старые данные
  pointStore.reset();
  
  // 2. Добавляем точки из snapshot
  pointStore.appendMany(snapshot.points);
  
  // 3. Устанавливаем viewport на последние точки
  const firstPoint = snapshot.points[0];
  const lastPoint = snapshot.points[snapshot.points.length - 1];
  viewport.setWindow(firstPoint.time, lastPoint.time);
}
```

2. **Добавление истории (infinite scroll)**:
```typescript
function prependHistory(points: Array<{ time: number; price: number }>) {
  // Добавляем точки в начало (для скролла влево)
  pointStore.prepend(points);
}
```

3. **Рендер-луп**:
```typescript
useEffect(() => {
  function render() {
    const points = pointStore.getAll();
    const viewport = viewport.getViewport();
    
    // Вычисляем диапазон цен для видимых точек
    const priceRange = calculatePriceRange(points, viewport);
    viewport.updatePriceRange(priceRange.min, priceRange.max);
    
    // Получаем анимированную цену для последней точки
    const animatedPrice = animatedPriceRef.current;
    const lastPoint = pointStore.getLast();
    
    // Создаем массив точек для рендеринга (с анимированной ценой)
    const renderPoints = animatedPrice && lastPoint
      ? [...points.slice(0, -1), { ...lastPoint, price: animatedPrice }]
      : points;
    
    // Рендерим график
    renderLine(ctx, renderPoints, viewport, width, height);
    
    // Рендерим другие элементы (trades, drawings, indicators, crosshair...)
    requestAnimationFrame(render);
  }
  
  render();
}, []);
```

### 5. React компонент (LineChart)

**Файл**: `frontend/components/chart/line/LineChart.tsx`

**Ответственность**: Интеграция с API, WebSocket, UI событиями.

#### 5.1. Загрузка snapshot при монтировании:

```typescript
useEffect(() => {
  if (!instrument) return;

  const loadSnapshot = async () => {
    const snapshot = await api(`/api/line/snapshot?symbol=${instrument}`);
    lineChart.initializeFromSnapshot(snapshot);
  };

  loadSnapshot();
}, [instrument]);
```

#### 5.2. Infinite scroll (загрузка истории):

```typescript
useEffect(() => {
  const checkScroll = () => {
    const viewport = lineChart.getViewport();
    const points = lineChart.getPoints();
    const firstPoint = points?.[0];
    
    if (!firstPoint) return;

    // Проверяем, близко ли viewport к левому краю данных
    const timeRange = viewport.timeEnd - viewport.timeStart;
    const threshold = timeRange * 0.2; // 20% от диапазона
    
    if (viewport.timeStart - firstPoint.time < threshold) {
      // Загружаем историю
      const { points: historyPoints } = await api(
        `/api/line/history?symbol=${instrument}&to=${firstPoint.time}&limit=300`
      );
      
      if (historyPoints.length > 0) {
        lineChart.prependHistory(historyPoints);
      }
    }
  };

  // Проверяем каждую секунду
  const interval = setInterval(checkScroll, 1000);
  return () => clearInterval(interval);
}, [instrument]);
```

#### 5.3. Интеграция с WebSocket:

```typescript
useWebSocket({
  activeInstrumentRef,
  onPriceUpdate: lineChart.handlePriceUpdate,  // Вызывается на каждый тик
  onServerTime: lineChart.handleServerTime,
  onTradeClose: lineChart.removeTrade,
});
```

---

## Жизненный цикл данных

### 1. Инициализация (загрузка страницы)

```
1. LineChart монтируется
   ↓
2. Вызывается GET /api/line/snapshot
   ↓
3. Получаем ~600 точек (10 минут истории)
   ↓
4. pointStore.reset() → pointStore.appendMany(points)
   ↓
5. viewport.setWindow(firstPoint.time, lastPoint.time)
   ↓
6. График отображается с историей
```

### 2. Live обновления (WebSocket)

```
1. WebSocket получает price:update (каждый тик)
   ↓
2. useLineData.onPriceUpdate(price, timestamp)
   ↓
3. АНИМАЦИЯ: setAnimatedPrice(price) ← каждый тик
   ↓
4. ДАННЫЕ: Проверяем, новая ли секунда
   ├─ Если та же секунда → пропускаем запись
   └─ Если новая секунда:
      ├─ pointStore.push({ time: second, price })
      └─ viewport.followNow(second) ← если autoFollow=true
   ↓
5. Рендер-луп обновляет canvas с анимированной ценой
```

### 3. Infinite scroll (скролл влево)

```
1. Пользователь скроллит влево (pan) или зумит
   ↓
2. viewport.timeStart приближается к firstPoint.time
   ↓
3. checkScroll() обнаруживает threshold (20% от диапазона)
   ↓
4. Вызывается GET /api/line/history?to=firstPoint.time&limit=300
   ↓
5. Получаем 300 точек до firstPoint.time
   ↓
6. pointStore.prepend(historyPoints) ← добавляем в начало
   ↓
7. График расширяется влево
```

### 4. Рендеринг

```
1. Рендер-луп (requestAnimationFrame)
   ↓
2. Получаем точки: points = pointStore.getAll()
   ↓
3. Фильтруем по viewport: visiblePoints = points.filter(p => 
     p.time >= viewport.timeStart && p.time <= viewport.timeEnd)
   ↓
4. Вычисляем priceRange для видимых точек
   ↓
5. Заменяем последнюю точку на анимированную:
   renderPoints = [...points.slice(0, -1), { ...lastPoint, price: animatedPrice }]
   ↓
6. Рендерим:
   - renderBackground()
   - renderGrid()
   - renderLine(renderPoints) ← основная линия
   - renderHoverHighlight() ← градиент CALL/PUT
   - renderTrades() ← оверлеи сделок
   - renderDrawings() ← рисунки пользователя
   - renderIndicators() ← индикаторы
   - renderCrosshair() ← перекрестие
```

---

## Детали реализации

### 1. Анимация последней точки

**Проблема**: Данные обновляются раз в секунду, но тики приходят чаще (5-10 раз в секунду). Как сделать плавное движение линии?

**Решение**: Используем анимированную цену для последней точки.

```typescript
// В useLineChart.ts
const animatedPriceRef = useRef<number | null>(null);

// В useLineData.ts (на каждый тик)
setAnimatedPrice(price);

// В рендер-лупе
const animatedPrice = animatedPriceRef.current;
const lastPoint = pointStore.getLast();
const renderPoints = animatedPrice && lastPoint
  ? [...points.slice(0, -1), { ...lastPoint, price: animatedPrice }]
  : points;
```

**Результат**: Линия плавно движется между секундными точками.

### 2. Защита от дублей в БД

**Проблема**: Два тика могут прийти в одну секунду, что создаст дубликаты.

**Решение**: 
1. Кеш `lastSecond` в `PricePointWriter` предотвращает множественные записи
2. Уникальный индекс `@@unique([symbol, timestamp])` в Prisma защищает на уровне БД
3. Используется `upsert` вместо `create` (обновляет если существует)

### 3. Ограничение размера в памяти

**Проблема**: Массив точек может расти бесконечно.

**Решение**: `MAX_POINTS = 3000` (~50 минут данных)
- При `push`: удаляем старые точки слева
- При `prepend`: удаляем новые точки справа

### 4. Graceful degradation

**Проблема**: Что если таблица `price_points` еще не создана (миграция не выполнена)?

**Решение**: 
- `PricePointWriter`: Логирует предупреждение, но не падает
- `LineChartController`: Возвращает пустой массив `points: []`
- График работает с live данными, просто без истории

### 5. Infinite scroll threshold

**Проблема**: Когда загружать историю? Если загружать слишком рано → лишние запросы, если слишком поздно → задержка.

**Решение**: Загружаем когда `viewport.timeStart - firstPoint.time < threshold`, где `threshold = timeRange * 0.2` (20% от видимого диапазона).

### 6. Viewport auto-follow

**Проблема**: Как автоматически следовать за новыми данными, но не мешать пользователю при zoom/pan?

**Решение**: Флаг `autoFollow`
- `true`: Viewport автоматически сдвигается вправо при новых данных
- `false`: Viewport зафиксирован (после zoom/pan)
- Сбрасывается через `resetFollow()` (двойной клик)

### 7. Преобразование координат

**Временная координата (X)**:
```typescript
function timeToX(time: number, viewport: LineViewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const normalized = (time - viewport.timeStart) / timeRange;
  return normalized * width;
}
```

**Ценовая координата (Y)**:
```typescript
function priceToY(price: number, priceMin: number, priceMax: number, height: number): number {
  const priceRange = priceMax - priceMin;
  const normalized = (price - priceMin) / priceRange;
  return height - (normalized * height); // Инвертируем (0 = верх)
}
```

---

## Схема потока данных

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  OtcPriceEngine → price_tick event → PricePointWriter      │
│                          ↓                                   │
│                   PostgreSQL (price_points)                 │
│                          ↓                                   │
│              GET /api/line/snapshot                          │
│              GET /api/line/history                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LineChart.tsx                                              │
│    ├─ useEffect → GET /api/line/snapshot                    │
│    │     ↓                                                   │
│    │  initializeFromSnapshot()                              │
│    │     ├─ pointStore.reset()                              │
│    │     ├─ pointStore.appendMany(points)                   │
│    │     └─ viewport.setWindow(...)                          │
│    │                                                          │
│    ├─ useWebSocket → price:update                           │
│    │     ↓                                                   │
│    │  handlePriceUpdate(price, timestamp)                    │
│    │     ├─ setAnimatedPrice(price) ← каждый тик            │
│    │     └─ pointStore.push({ time, price }) ← раз в секунду│
│    │                                                          │
│    └─ useEffect → checkScroll() (infinite scroll)           │
│          ↓                                                   │
│       GET /api/line/history                                  │
│          ↓                                                   │
│       prependHistory(points)                                 │
│          ↓                                                   │
│       pointStore.prepend(points)                             │
│                                                              │
│  useLineChart.ts (render loop)                               │
│    ├─ pointStore.getAll() → points                          │
│    ├─ animatedPriceRef.current → animatedPrice              │
│    ├─ renderPoints = [...points, { ...lastPoint, price: animatedPrice }]│
│    └─ renderLine(renderPoints) → canvas                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Резюме

### Ключевые принципы:

1. **Разделение ответственности**: Анимация (каждый тик) vs Данные (раз в секунду)
2. **Временной viewport**: Окно основано на времени, а не на индексах
3. **Price points**: 1 точка в секунду (не тики, не свечи)
4. **Infinite scroll**: Загрузка истории при приближении к левому краю
5. **Graceful degradation**: Работает даже если БД не готова

### Файлы:

**Backend**:
- `backend/prisma/schema.prisma` — модель PricePoint
- `backend/src/prices/PricePointWriter.ts` — запись точек
- `backend/src/prices/PriceEngineManager.ts` — интеграция
- `backend/src/modules/linechart/linechart.controller.ts` — API endpoints

**Frontend**:
- `frontend/components/chart/line/useLinePointStore.ts` — хранилище точек
- `frontend/components/chart/line/useLineViewport.ts` — временное окно
- `frontend/components/chart/line/useLineData.ts` — live обновления
- `frontend/components/chart/line/useLineChart.ts` — главный хук
- `frontend/components/chart/line/LineChart.tsx` — React компонент

---

**Дата создания**: 2026-01-29  
**Версия**: 1.0
