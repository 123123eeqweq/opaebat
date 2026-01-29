# Backend Tests

## Структура

```
test/
├── domain/          # Domain-тесты (без Fastify/Prisma)
├── integration/     # HTTP + DB тесты
├── realtime/        # WebSocket тесты
├── helpers/         # Фабрики, моки
└── setup.ts         # Глобальный setup
```

## Запуск

```bash
# Все тесты
npm test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

## Принципы

1. **Domain тесты** - чистые, быстрые, без внешних зависимостей
2. **Integration тесты** - реальный Fastify + test DB
3. **Realtime тесты** - WebSocket, минимум но обязательно

## Test Database

Используется отдельная БД: `im5_test`

Перед запуском integration тестов убедитесь, что:
- БД создана
- Миграции применены: `npm run prisma:migrate`

## Структура тестов

### Domain тесты (`test/domain/`)
- **TradeService.test.ts** - открытие сделок, валидация
- **TradeClosingService.test.ts** - закрытие сделок, WIN/LOSS логика
- **TimeService.test.ts** - серверное время, countdown
- **edge.test.ts** - граничные случаи

### Integration тесты (`test/integration/`)
- **auth.test.ts** - регистрация, логин, cookie-based auth

### Realtime тесты (`test/realtime/`)
- **websocket.test.ts** - подключение, события, auth

## Принципы тестирования

1. **Domain тесты** - чистые, быстрые, без внешних зависимостей
2. **Integration тесты** - реальный Fastify + test DB
3. **Realtime тесты** - WebSocket, минимум но обязательно

Тестируем **контракты и поведение**, а не реализацию.
