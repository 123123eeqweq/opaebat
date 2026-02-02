# Какие файлы кинуть ChatGPT для разбора линейного графика и анимации

Скопируй в ChatGPT **в таком порядке** (содержимое файлов целиком).

---

## 1. Сначала контекст (документация)

**Файл:** `CHART_ANIMATION_ISSUES_AND_FIXES.md` (в корне проекта)  
→ Описание проблем: анимация live-сегмента, откуда рывки, что уже пробовали.

**Файл:** `LINE_CHART_ARCHITECTURE.md` (в корне проекта)  
→ Как устроен линейный график: поток данных, аниматор, viewport, заморозка range.

---

## 2. Ядро линейного графика (обязательно)

| № | Путь | Зачем |
|---|------|--------|
| 1 | `frontend/components/chart/line/useLinePointStore.ts` | Хранение точек истории |
| 2 | `frontend/components/chart/line/useLineViewport.ts` | Временное окно, zoom/pan |
| 3 | `frontend/components/chart/line/useLineData.ts` | WebSocket → live-сегмент, запись раз в секунду |
| 4 | `frontend/components/chart/line/useLinePriceAnimator.ts` | Анимация цены (lerp, easeOutCubic) |
| 5 | `frontend/components/chart/line/useLineChart.ts` | Оркестратор, render loop, handlePriceUpdate |
| 6 | `frontend/components/chart/line/renderLine.ts` | Рендер линии, live-сегмента, calculatePriceRange |
| 7 | `frontend/components/chart/line/lineTypes.ts` | Типы (LineViewport, TickPoint) |
| 8 | `frontend/components/chart/line/LineChart.tsx` | React-компонент, WebSocket, pan/zoom |

---

## 3. Дополнительно (если спросит про рендер/UI)

| Путь | Зачем |
|------|--------|
| `frontend/components/chart/line/renderPulsatingPoint.ts` | Пульсирующая точка на конце линии |
| `frontend/components/chart/line/renderTrades.ts` | Отрисовка сделок (если есть) |

---

## 4. Текст запроса для ChatGPT (скопируй и вставь после файлов)

```
У меня линейный график на тиках (time, price). Есть проблемы с анимацией live-сегмента:

1. Конец линии должен плавно ехать к новой цене (как в CHART_ANIMATION_ISSUES_AND_FIXES.md и LINE_CHART_ARCHITECTURE.md).
2. Важно: в кадре должен быть ОДИН источник цены — visualPrice (liveSegment ? animator.getAnimatedPrice() : lastHistoryPoint.price). Нигде не использовать fromPrice/rawPrice для отрисовки конца линии.
3. fromPrice в live-сегменте должен фиксироваться ОДИН РАЗ при создании сегмента (раз в секунду), а не пересоздаваться каждый тик — иначе линия рвётся и «сначала вверх, потом хуяк вниз».
4. Price range на время live-анимации должен быть заморожен (не пересчитывать по animatedPrice каждый кадр), иначе масштаб дёргается.
5. Аниматор не сбрасывать при закрытии секунды — только seed при первом появлении live-сегмента; при пересоздании сегмента seed не делать (hasValueRef).

Разбери по файлам, как сейчас устроены данные и рендер, и предложи конкретные правки (патчи) по файлам, чтобы анимация работала стабильно и без рывков.
```

---

## Краткий чеклист файлов для копирования

- [ ] `CHART_ANIMATION_ISSUES_AND_FIXES.md`
- [ ] `LINE_CHART_ARCHITECTURE.md`
- [ ] `frontend/components/chart/line/useLinePointStore.ts`
- [ ] `frontend/components/chart/line/useLineViewport.ts`
- [ ] `frontend/components/chart/line/useLineData.ts`
- [ ] `frontend/components/chart/line/useLinePriceAnimator.ts`
- [ ] `frontend/components/chart/line/useLineChart.ts`
- [ ] `frontend/components/chart/line/renderLine.ts`
- [ ] `frontend/components/chart/line/lineTypes.ts`
- [ ] `frontend/components/chart/line/LineChart.tsx`

После этого вставь текст запроса из пункта 4.
