# Проблемы анимации графиков и потенциальные решения

Документ описывает две связанные проблемы анимации (линейный и свечной графики), места в коде, причины и варианты исправления. Предназначен для передачи в чат (например, ChatGPT) с целью доработки или ревью.

---

## 1. Линейный график: отсутствие плавной анимации live-сегмента

### 1.1 Суть проблемы

- **Симптом**: Сегмент «история → текущая цена» на линейном графике не анимируется: конец линии прыгает к новой цене при каждом тике WebSocket.
- **Ожидание**: Плавное движение конца линии к новой цене (аналогично анимации live-свечи на свечном графике).

### 1.2 Где в коде формируется live-сегмент

- **`frontend/components/chart/line/useLineData.ts`**  
  Обработчик `onPriceUpdate(price, timestamp)` при каждом тике создаёт/обновляет live-сегмент:

```ts
const liveSegment: LiveSegment = {
  fromTime: lastHistoryPoint.time,
  toTime: now,
  fromPrice: lastHistoryPoint.price,
  animatedPrice: price,  // ← сразу текущая цена, без анимации
};
setLiveSegment?.(liveSegment);
```

- Тип **`LiveSegment`** в том же файле: поля `fromTime`, `toTime`, `fromPrice`, **`animatedPrice`** — сейчас это просто «текущая цена», не анимированное значение.

### 1.3 Где используется `animatedPrice`

- **`frontend/components/chart/line/useLineChart.ts`**  
  В render-лупе:
  - `liveSegmentRef.current` — текущий live-сегмент.
  - Для пульсирующей точки: `price: liveSegment.animatedPrice`.
  - Для расчёта `currentPrice` (price line, hover и т.д.): `liveSegment?.animatedPrice ?? lastHistoryPoint?.price ?? 0`.
- **`frontend/components/chart/line/renderLine.ts`**  
  Функция **`renderLiveSegment`**: рисует отрезок от `(fromTime, fromPrice)` до `(toTime, liveSegment.animatedPrice)`. То есть конец линии напрямую привязан к `animatedPrice`.

**Причина рывков**: при каждом тике `animatedPrice` меняется на новую цену → конец линии мгновенно перескакивает.

### 1.4 Потенциальное решение (линейный график)

Ввести отдельный слой анимации цены только для отображения (не менять логику истории и запись раз в секунду).

1. **Новый хук `useLinePriceAnimator`** (например, `frontend/components/chart/line/useLinePriceAnimator.ts`):
   - Хранит «текущую отображаемую цену» и при вызове `onPriceUpdate(price)` запускает анимацию от текущего значения к `price`.
   - Использовать **lerp** с **easeOutCubic** и длительностью ~350 ms (как в `useCandleAnimator`).
   - Методы: `onPriceUpdate(price)`, `update(now)` (вызов из RAF), `getAnimatedPrice()`, `reset()`.

2. **Интеграция в `useLineChart`**:
   - В `handlePriceUpdate` вызывать не только `lineData.onPriceUpdate(price, timestamp)`, но и `priceAnimator.onPriceUpdate(price)`.
   - В render-лупе каждый кадр вызывать `priceAnimator.update(now)` и подставлять в live-сегмент **анимированную** цену: например, хранить live-сегмент с полем `animatedPrice`, которое берётся из `priceAnimator.getAnimatedPrice()` (или формировать объект для рендера с этой ценой).
   - При первом появлении live-сегмента после `null` задавать начальное значение аниматора из `segment.fromPrice`, чтобы не было скачка от старой последней точки к первой анимированной цене (ref `hadLiveSegmentRef`: пока не было live-сегмента — при появлении один раз seed от `fromPrice`, дальше работать как обычно).
   - В `reset` и `initializeFromSnapshot` вызывать `priceAnimator.reset()`.

3. **Разделение данных и отображения**:
   - `useLineData` по-прежнему отвечает за историю и за «сырой» live-сегмент (или только за факт «есть ли live» и `fromPrice`/время).
   - Аниматор отвечает только за плавное значение цены для отрисовки; все места, где сейчас читается `liveSegment.animatedPrice` для рисования и UI, должны брать значение из аниматора, когда live-сегмент активен.

Кратко: **причина** — использование сырой цены тика как `animatedPrice`; **решение** — ввести аниматор цены (lerp + easeOutCubic, 350 ms) и использовать его выход только для отрисовки и производных UI.

---

## 2. Свечной график: «рывок» при закрытии свечи и «дрожание» формирующейся свечи

### 2.1 Суть проблемы

- **Рывок**: В момент появления новой свечи после закрытия предыдущей график «дёргается» — конец формирующейся свечи один кадр прыгает к новой цене.
- **Дрожание**: Пока формируется live-свеча, её конец (close/high/low) постоянно подрагивает вместо плавного движения.

### 2.2 Где в коде обрабатываются тики и закрытие свечи

- **`frontend/components/chart/useChart.ts`**  
  Подписка на WebSocket:
  - **`onPriceUpdate(price, timestamp)`**: вызываются `chartData.handlePriceUpdate(price, timestamp)`, `viewport.setLatestCandleTime(...)`, **`candleAnimator.onPriceUpdate(price)`**.
  - **`onCandleClose(wsCandle, timeframeStr)`**: после фильтра по timeframe и конвертации в snapshot вызываются `chartData.handleCandleClose(...)`, `viewport.setLatestCandleTime(...)`, **`candleAnimator.onCandleClose()`**.

То есть анимация свечи полностью управляется в **`frontend/components/chart/internal/useCandleAnimator.ts`**.

### 2.3 Логика `useCandleAnimator` (текущая)

- **`onPriceUpdate(price)`**:
  - Обновляет «правду» экстремумов: `animated.truthHigh` / `truthLow` из текущей live-свечи.
  - Всегда запускает анимацию: `from = animated.close`, `to = price`, `startTime = performance.now()`, `duration = 350` ms.
- **`onCandleClose()`**:
  - Обнуляет анимированное состояние: `animatedRef.current = null`, `animationRef.current.active = false`.
- **`update(now)`** (каждый кадр RAF):
  - Если анимация активна: по прогрессу (easeOutCubic) считает `close` и визуальные high/low, затем синхронизирует с «правдой».
  - Если анимации нет — копирует из live-свечи в `animated`.

При первом после закрытия свечи тике:
- `animatedRef.current` ещё `null`;
- **`ensureInitialized()`** создаёт новый `animated` из **текущей** live-свечи: `open = live.open`, **`close = live.close`** (уже новая цена с сервера).
- Затем в том же `onPriceUpdate` запускается анимация **from = animated.close, to = price** (часто одно и то же).
- На предыдущем кадре пользователь видел старый `close` (предыдущая свеча), на следующем — уже новый `close` без перехода → **рывок**.

При частых тиках (например, каждые 50–100 ms):
- Каждый тик перезапускает анимацию: `from = текущий animated.close`, `to = новая price`.
- Цель анимации постоянно смещается; за 350 ms может прийти несколько новых цен и несколько перезапусков → визуально **дрожание**, конец свечи не успевает «осесть».

### 2.4 Потенциальное решение (свечной график)

Имеет смысл разделить поведение «первый тик после закрытия свечи» и «остальные тики».

1. **Флаг «только что закрыли»**  
   Ввести ref, например **`hasJustClosedRef`**:
   - В **`onCandleClose`** устанавливать `hasJustClosedRef.current = true`.
   - В **`onPriceUpdate`** при первом вызове после закрытия:
     - Анимировать от **предыдущего close** (т.е. от `open` новой свечи) к новой `price`: задать `from = animated.open` (или явно взять цену закрытия предыдущей свечи), `to = price`.
     - После этого вызова сбросить `hasJustClosedRef.current = false`.
   - В остальных вызовах `onPriceUpdate` оставить текущую логику: `from = animated.close`, `to = price`.

Так устраняется рывок: первое движение после закрытия идёт от старого close к новой цене, а не от уже обновлённого `live.close`.

2. **Смягчение дрожания**  
   Варианты (можно комбинировать):
   - Не перезапускать анимацию на каждом тике, а **обновлять цель** `to` на новую цену, оставляя текущий прогресс и `from` (или пересчитывать `from` как текущее значение, чтобы не было скачка).
   - Или ограничить частоту перезапуска анимации (например, не чаще раза в 100–150 ms), если обновление цели сложно встроить в текущую модель.
   - Или уменьшить `duration` (например, до 200 ms), чтобы анимация быстрее догоняла цену и меньше конфликтовала с частыми тиками.

Кратко: **причина рывка** — после `onCandleClose` состояние обнуляется, а при первом `onPriceUpdate` анимированное состояние инициализируется уже с новой ценой (`live.close`). **Причина дрожания** — перезапуск анимации на каждом тике при длительности 350 ms. **Решение** — флаг «только что закрыли» и анимация первого тика от предыдущего close; опционально — обновление цели без полного перезапуска или ограничение частоты перезапуска.

**Правило (реализовано в `useCandleAnimator.ts`):**  
Первый тик после закрытия свечи всегда анимируется от close предыдущей свечи (якорь = `live.open` новой свечи), а не от `live.close`. Так делают нормальные терминалы; иначе — визуальный рывок.

---

## 3. Сводка по файлам

| Файл | Роль в проблемах |
|------|-------------------|
| `frontend/components/chart/line/useLineData.ts` | Формирует live-сегмент с `animatedPrice = price` без анимации. |
| `frontend/components/chart/line/useLineChart.ts` | Render-луп, использование `liveSegment.animatedPrice` для отрисовки и UI. |
| `frontend/components/chart/line/renderLine.ts` | `renderLiveSegment` рисует до `animatedPrice`. |
| `frontend/components/chart/internal/useCandleAnimator.ts` | Анимация live-свечи; текущая логика даёт рывок после close и дрожание при частых тиках. |
| `frontend/components/chart/useChart.ts` | Вызывает `candleAnimator.onPriceUpdate(price)` и `candleAnimator.onCandleClose()`. |

---

## 4. Что передать в чат (GPT и т.п.)

- Этот файл целиком.
- При необходимости — фрагменты кода из указанных файлов (секции 1.2–1.3 и 2.2–2.3).
- Запрос в духе: «По документу CHART_ANIMATION_ISSUES_AND_FIXES.md: реализуй исправления для линейного графика (аниматор цены) и для свечного (hasJustClosedRef и при необходимости смягчение дрожания), не ломая существующие сбросы и смену timeframe».

После реализации стоит проверить: смена инструмента/timeframe, инициализация из снапшота, отключение/включение графика — всё должно по-прежнему сбрасывать/инициализировать анимацию без артефактов.
