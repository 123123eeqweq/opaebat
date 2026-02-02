# График: Фактическая Архитектура

**Дата анализа**: 2026-01-29  
**Цель**: Зафиксировать текущее поведение графика без предложений по улучшению

---

## 1. Общее описание графика

### Технологический стек
- **React**: Компоненты и хуки
- **Canvas API**: Отрисовка через `<canvas>`
- **Render Loop**: `requestAnimationFrame` в `useRenderLoop.ts`
- **Точка входа**: `useChart.ts` - главный оркестратор

### Основной render loop
- **Файл**: `frontend/components/chart/internal/useRenderLoop.ts`
- **Механизм**: `requestAnimationFrame` вызывается каждый кадр
- **Последовательность рендера**:
  1. Очистка canvas (`clearRect`)
  2. Вызов `renderEngine` (координация всех render-функций)
  3. Отрисовка grid, candles, axes, price line

### Структура компонентов
```
useChart.ts (оркестратор)
├── useCanvasInfrastructure (canvas setup)
├── useChartData (данные свечей)
├── useViewport (видимая область)
├── useRenderLoop (RAF loop)
├── useChartInteractions (pan/zoom)
├── useHistoryLoader (загрузка истории)
└── другие хуки (crosshair, indicators, drawings...)
```

---

## 2. Модель данных свечей

### Хранение данных
- **Файл**: `frontend/components/chart/internal/useChartData.ts`
- **Механизм**: `useRef` (не `useState`)
  - `candlesRef.current` - массив закрытых свечей
  - `liveCandleRef.current` - текущая открытая свеча
  - `earliestRealTimeRef.current` - реальный timestamp самой ранней свечи (для API)

### Структура Candle
```typescript
type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;  // timestamp начала свечи
  endTime: number;    // timestamp конца свечи
  isClosed: boolean;  // закрыта ли свеча
}
```

### Использование timestamp
- **Обязательно используется**: `startTime` и `endTime` присутствуют в каждой свече
- **Нормализация времени**: При инициализации и добавлении истории время нормализуется
  - Исторические свечи получают нормализованные `startTime` и `endTime`
  - Нормализация: `normalizedStartTime = anchorTime - (index * timeframeMs)`
  - Цель: устранение дырок между свечами
- **Реальные timestamps**: Хранятся отдельно в `earliestRealTimeRef` для API запросов

### Индексы
- **НЕ используются** для геометрии или позиционирования
- Используются только для итерации по массиву свечей

---

## 3. Viewport / Window модель

### Структура Viewport
```typescript
type Viewport = {
  timeStart: number;   // timestamp начала видимой области
  timeEnd: number;     // timestamp конца видимой области
  priceMin: number;    // минимальная цена (Y-ось)
  priceMax: number;    // максимальная цена (Y-ось)
  yMode: 'auto' | 'manual';  // режим масштабирования Y
}
```

### Source of Truth
- **Viewport хранится в**: `useViewport.ts` → `viewportRef.current`
- **Тип модели**: **TIME-BASED** (не index-based)
- **Определяющие параметры**: `timeStart` и `timeEnd` (timestamps)

### Конфигурация
```typescript
type ViewportConfig = {
  visibleCandles: number;      // например 60 (используется только для инициализации)
  yPaddingRatio: number;       // например 0.1 (10% padding по Y)
  rightPaddingRatio: number;  // например 0.35 (35% для follow mode)
}
```

### Логика работы
- **Инициализация**: Вычисляется на основе последней свечи и `visibleCandles`
  - `timeEnd = liveCandle.endTime` (или последняя закрытая свеча)
  - `timeStart = timeEnd - (visibleCandles * timeframeMs)`
- **Follow mode**: При включенном follow mode viewport автоматически сдвигается к live-свече
- **Auto-fit Y**: Автоматически пересчитывается `priceMin` и `priceMax` на основе видимых свечей

---

## 4. Расчет X координаты свечи

### Формула
```typescript
function timeToX(time: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}
```

### Где реализована
- **Файлы**: 
  - `renderCandles.ts` (строка 41)
  - `renderGrid.ts` (строка 75)
  - Другие render-функции используют ту же логику

### От чего зависит
- **Зависит от**: `candle.startTime` (timestamp свечи) и `viewport.timeStart/timeEnd`
- **НЕ зависит от**: индекса свечи, количества свечей
- **Тип**: **TIME-BASED** расчет

### Использование
- X позиция свечи: `startX = timeToX(candle.startTime, viewport, width)`
- Центр свечи: `centerX = startX + candleWidth / 2`

---

## 5. Расчет ширины свечи

### Формула
```typescript
const timeRange = viewport.timeEnd - viewport.timeStart;
const candleWidth = timeRange > 0 ? (timeframeMs / timeRange) * width : 0;
```

### Где реализована
- **Файл**: `frontend/components/chart/internal/render/renderCandles.ts` (строка 194)

### От чего зависит
- **Зависит от**: 
  - `timeframeMs` (длительность одной свечи в миллисекундах, например 5000 для 5s)
  - `timeRange` (разница между `timeEnd` и `timeStart` viewport)
  - `width` (ширина canvas)
- **НЕ зависит от**: количества видимых свечей, индекса свечи

### Как влияет timeframe и zoom
- **Timeframe**: Прямо влияет через `timeframeMs` в формуле
- **Zoom**: Изменяет `timeRange` → меняется `candleWidth`
  - Zoom in (меньше timeRange) → шире свечи
  - Zoom out (больше timeRange) → уже свечи

### Важно
- Ширина свечи **одинакова для всех свечей** в текущем viewport
- Это гарантирует равномерное распределение, даже если есть пропуски в данных

---

## 6. Zoom

### Какие переменные меняются
- **Изменяется**: `viewport.timeStart` и `viewport.timeEnd` (уменьшается или увеличивается `timeRange`)
- **НЕ меняется**: `priceMin`, `priceMax` (пересчитываются через auto-fit после zoom)

### Реализация
- **Файл**: `frontend/components/chart/internal/interactions/math.ts` → `zoomViewportTime`
- **Формула**:
  ```typescript
  const currentTimeRange = viewport.timeEnd - viewport.timeStart;
  const newTimeRange = currentTimeRange * zoomFactor;
  // Ограничение: minVisibleCandles * timeframeMs <= newTimeRange <= maxVisibleCandles * timeframeMs
  ```

### Что происходит при zoom in / out
- **Zoom in** (скролл вверх, `zoomFactor < 1`):
  - `timeRange` уменьшается
  - Свечи становятся шире
  - Видно меньше свечей
- **Zoom out** (скролл вниз, `zoomFactor > 1`):
  - `timeRange` увеличивается
  - Свечи становятся уже
  - Видно больше свечей

### Anchor point
- Zoom происходит относительно точки курсора мыши
- `anchorTime = mouseXToTime(e.clientX, canvas, viewport)`
- Новый viewport вычисляется так, чтобы точка под курсором осталась на месте

### Тип модели
- **TIME-BASED**: Zoom работает через изменение диапазона времени, не через изменение количества свечей

---

## 7. Pan

### Какие переменные меняются
- **Изменяется**: `viewport.timeStart` и `viewport.timeEnd` (сдвигаются на одинаковую величину)
- **НЕ меняется**: `timeRange` (ширина viewport остается постоянной)

### Реализация
- **Файл**: `frontend/components/chart/internal/interactions/math.ts` → `panViewportTime`
- **Формула**:
  ```typescript
  const deltaTime = deltaX / pixelsPerMs;
  const newTimeStart = viewport.timeStart - deltaTime;
  const newTimeEnd = newTimeStart + timeRange;
  ```

### Что именно двигается
- **Двигается**: временной диапазон viewport
- **Направление**:
  - Drag влево (`deltaX < 0`) → `timeStart` и `timeEnd` увеличиваются → показываем более старые свечи
  - Drag вправо (`deltaX > 0`) → `timeStart` и `timeEnd` уменьшаются → показываем более новые свечи

### Есть ли зависимость от времени
- **ДА**: Pan полностью зависит от времени
- Преобразование: `deltaX` (пиксели) → `deltaTime` (миллисекунды) → изменение `timeStart/timeEnd`

### Тип модели
- **TIME-BASED**: Pan работает через сдвиг временного диапазона

---

## 8. Использование времени (timestamp)

### Где timestamp используется обязательно

#### Для геометрии (X координаты)
- **Расчет X позиции свечи**: `timeToX(candle.startTime, viewport, width)`
- **Расчет ширины свечи**: `(timeframeMs / timeRange) * width`
- **Grid вертикальные линии**: Выравнивание по времени
- **Ось X**: Метки времени

#### Для данных
- **Структура Candle**: `startTime`, `endTime` обязательны
- **Фильтрация видимых свечей**: Проверка `candle.startTime/endTime` попадает в `[timeStart, timeEnd]`
- **Нормализация времени**: При инициализации и добавлении истории

#### Для истории
- **API запросы**: Используется реальный `earliestRealTime` для параметра `?to=`
- **Дедупликация**: Проверка `realStartTimesRef` по реальным timestamps

#### Для follow mode
- **Якорь времени**: `latestCandleTimeRef` хранит timestamp последней свечи
- **Автосдвиг**: Viewport автоматически сдвигается к `liveCandle.endTime`

### Где timestamp используется только для данных (не для геометрии)
- **Нет таких мест**: Timestamp используется везде, включая геометрию

### Где timestamp лишний (но используется)
- **Нет таких мест**: Все использования timestamp необходимы для текущей архитектуры

---

## 9. Загрузка истории

### Как формируется запрос
- **Файл**: `frontend/components/chart/internal/history/useHistoryLoader.ts`
- **URL**: `/api/quotes/candles?instrument={instrument}&timeframe={timeframe}&to={toTime}&limit={limit}`
- **Параметры**:
  - `instrument`: Текущий инструмент (из ref для избежания stale closure)
  - `timeframe`: Строка "5s"
  - `to`: Реальный timestamp самой ранней свечи (`earliestRealTimeRef.current`)
  - `limit`: 200 свечей за запрос

### Что используется как `to`
- **Реальный timestamp**: `getEarliestRealTime()` возвращает `earliestRealTimeRef.current`
- Это **НЕ нормализованное** время, а реальный timestamp из БД
- Хранится отдельно от нормализованных времен свечей

### Как история добавляется в candles
- **Метод**: `prependCandles(newCandles, timeframeMs)` в `useChartData.ts`
- **Процесс**:
  1. Дедупликация по реальным `startTime` (через `realStartTimesRef`)
  2. Сортировка по времени (от старых к новым)
  3. Нормализация времени относительно существующих свечей
  4. Prepend в начало массива `candlesRef.current`

### Нормализация при prepend
```typescript
// Якорь = startTime первой существующей свечи
const anchorTime = firstExistingCandle.startTime;
// Первая новая свеча идет ПЕРЕД существующими
const firstNormalizedTime = anchorTime - (uniqueNew.length * timeframeMs);
// Каждая новая свеча получает нормализованное время
normalizedStartTime = firstNormalizedTime + i * timeframeMs;
normalizedEndTime = normalizedStartTime + timeframeMs;
```

### Есть ли сдвиг viewport
- **НЕТ**: Viewport не сдвигается автоматически при загрузке истории
- Пользователь должен сделать pan влево, чтобы увидеть загруженные свечи

### Триггер загрузки
- **Условие**: `viewport.timeStart` близко к `earliestTime` (normalized) свечей
- **Порог**: `PRELOAD_THRESHOLD_MS = 5000` (5 секунд до границы)

---

## 10. Что уже работает стабильно

### Follow mode
- **Работает**: Автоматический сдвиг viewport к live-свече
- **Анимация**: Плавный сдвиг через `advanceFollowAnimation` (320ms, easeOutCubic)
- **Выключение**: При pan/zoom follow mode автоматически выключается

### Нормализация времени
- **Работает**: Устранение дырок между свечами
- **Механизм**: Все свечи получают нормализованные `startTime/endTime` с фиксированным шагом `timeframeMs`
- **Результат**: График выглядит непрерывным, даже если в данных есть пропуски

### Auto-fit Y
- **Работает**: Автоматический пересчет `priceMin/priceMax` на основе видимых свечей
- **Padding**: Добавляется 10% padding сверху и снизу
- **Режим**: Работает только если `yMode === 'auto'`

### Y-scale drag
- **Работает**: Ручное масштабирование Y через drag правой оси
- **Режим**: Переключает `yMode` в `'manual'` при начале drag
- **Ограничения**: От 1% до 100x от начального диапазона

### Live candle анимация
- **Работает**: Плавное обновление live-свечи при `price:update`
- **Механизм**: `useCandleAnimator` с интерполяцией

### Загрузка истории
- **Работает**: Автоматическая загрузка при pan влево
- **Дедупликация**: Защита от дубликатов через `realStartTimesRef`
- **Ограничение**: Максимум 3000 свечей в памяти

### Crosshair
- **Работает**: Снэп к центру свечи по `timeframeMs`
- **Формула**: `snapTimeToCandleCenter(time, timeframeMs)`

### Индикаторы
- **Работают**: RSI, SMA, EMA, Bollinger Bands и др.
- **Расчет**: На основе source candles (classic mode)

### Drawings
- **Работают**: Горизонтальные, вертикальные, трендовые линии и др.
- **Хранение**: В `useDrawings`, координаты в time/price пространстве

---

## 11. Список ключевых файлов

### Файлы, влияющие на геометрию

#### Viewport (видимая область)
- `frontend/components/chart/internal/useViewport.ts` - управление viewport
- `frontend/components/chart/internal/viewport.types.ts` - типы Viewport

#### Рендеринг
- `frontend/components/chart/internal/render/renderEngine.ts` - оркестратор рендера
- `frontend/components/chart/internal/render/renderCandles.ts` - отрисовка свечей
- `frontend/components/chart/internal/render/renderGrid.ts` - сетка
- `frontend/components/chart/internal/render/renderAxes.ts` - оси

#### Взаимодействие
- `frontend/components/chart/internal/interactions/useChartInteractions.ts` - pan/zoom handlers
- `frontend/components/chart/internal/interactions/math.ts` - математика pan/zoom

### Файлы, влияющие на данные

#### Данные свечей
- `frontend/components/chart/internal/useChartData.ts` - хранение и управление свечами
- `frontend/components/chart/internal/chart.types.ts` - типы Candle

#### История
- `frontend/components/chart/internal/history/useHistoryLoader.ts` - загрузка истории
- `frontend/components/chart/internal/history/history.types.ts` - типы истории

#### WebSocket
- `frontend/lib/hooks/useWebSocket.ts` - WebSocket подключение
- Обработка `price:update` и `candle:close` событий

### Файлы, влияющие на взаимодействие

#### Основные взаимодействия
- `frontend/components/chart/internal/interactions/useChartInteractions.ts` - pan, zoom, Y-scale drag
- `frontend/components/chart/internal/interactions/math.ts` - чистые функции pan/zoom

#### Crosshair
- `frontend/components/chart/internal/crosshair/useCrosshair.ts` - курсор и снэп

#### Drawings
- `frontend/components/chart/internal/drawings/useDrawings.ts` - хранение drawings
- `frontend/components/chart/internal/drawings/useDrawingInteractions.ts` - создание drawings
- `frontend/components/chart/internal/drawings/useDrawingEdit.ts` - редактирование drawings

### Главный оркестратор
- `frontend/components/chart/useChart.ts` - координация всех подсистем
- `frontend/components/chart/internal/useRenderLoop.ts` - RAF loop

---

## 12. Ключевые архитектурные решения

### Time-based модель
- **Весь график работает через время**: X координаты, viewport, pan, zoom - все зависит от timestamps
- **Нет index-based логики**: Индексы используются только для итерации по массивам

### Нормализация времени
- **Проблема**: Исторические свечи могут иметь пропуски во времени
- **Решение**: Нормализация времени при инициализации и добавлении истории
- **Результат**: График выглядит непрерывным, без дырок

### Разделение реального и нормализованного времени
- **Реальные timestamps**: Хранятся отдельно для API запросов (`earliestRealTimeRef`)
- **Нормализованные timestamps**: Используются для геометрии и отображения
- **Дедупликация**: По реальным timestamps при загрузке истории

### Ref-based хранение данных
- **Не используется useState**: Все данные в `useRef` для избежания лишних ререндеров
- **Обновления**: Через callbacks (`onDataChange`) для пересчета viewport

### Follow mode
- **Механизм**: Плавная анимация через `advanceFollowAnimation`
- **Якорь**: `latestCandleTimeRef` хранит timestamp последней свечи
- **Автовыключение**: При pan/zoom follow mode выключается

---

## 13. Зависимости от времени

### Где время критично (нельзя убрать)

#### Геометрия
- **X координаты**: Полностью зависят от `candle.startTime` и `viewport.timeStart/timeEnd`
- **Ширина свечи**: Зависит от `timeframeMs` и `timeRange`
- **Grid**: Вертикальные линии выравниваются по времени

#### Viewport
- **Определение видимой области**: Через `timeStart` и `timeEnd`
- **Follow mode**: Привязка к `liveCandle.endTime`

#### История
- **API запросы**: Используют реальные timestamps для `?to=` параметра

### Где время используется, но теоретически можно заменить

#### Pan/Zoom
- **Текущая реализация**: Работает через изменение временного диапазона
- **Теоретически**: Можно переделать на index-based, но потребует полного рефакторинга

#### Фильтрация видимых свечей
- **Текущая реализация**: Проверка `candle.startTime/endTime` попадает в `[timeStart, timeEnd]`
- **Теоретически**: Можно фильтровать по индексам, но потребует изменения viewport модели

---

## 14. Что нельзя ломать

### Визуально работающие части
1. **Непрерывность графика**: Нормализация времени устраняет дыроки
2. **Равномерная ширина свечей**: Все свечи одинаковой ширины в текущем viewport
3. **Follow mode**: Плавный автосдвиг к live-свече
4. **Auto-fit Y**: Автоматическое масштабирование по цене
5. **Live candle анимация**: Плавное обновление при изменении цены
6. **Crosshair снэп**: Точное попадание в центр свечи
7. **Загрузка истории**: Работает без дубликатов и пропусков

### Критичные инварианты
1. **open[n] === close[n-1]**: Свечи должны стыковаться без разрывов
2. **high >= max(open, close)**: Инвариант данных свечи
3. **low <= min(open, close)**: Инвариант данных свечи
4. **timeStart < timeEnd**: Viewport всегда валиден
5. **Нормализованное время**: Все свечи имеют фиксированный шаг `timeframeMs`

---

## Заключение

Текущий график полностью построен на **time-based модели**. Все геометрические расчеты, viewport, pan и zoom работают через timestamps. Нормализация времени обеспечивает визуальную непрерывность графика, но при этом реальные timestamps сохраняются для API запросов и дедупликации.

Основные архитектурные решения:
- Time-based viewport (`timeStart`, `timeEnd`)
- Нормализация времени для устранения дырок
- Разделение реального и нормализованного времени
- Ref-based хранение данных
- Follow mode с плавной анимацией

Все части системы тесно связаны с временем, что делает переход на index-based модель нетривиальной задачей, требующей полного рефакторинга viewport и render логики.
