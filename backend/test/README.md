# Backend Tests

## Структура

```
test/
├── domain/          # Domain-тесты (без Fastify/Prisma)
├── unit/            # Unit-тесты (validation, utils)
├── integration/     # HTTP + DB тесты
├── realtime/        # WebSocket тесты
├── helpers/         # Фабрики, моки
└── setup.ts         # Глобальный setup
```

## Запуск

```bash
# Все тесты
npm test

# Только domain + unit (быстрые, без DB)
npm test -- test/domain test/unit

# Integration тесты (требуют im5_test)
npm test -- test/integration

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

## Принципы

1. **Domain тесты** - чистые, быстрые, без внешних зависимостей
2. **Unit тесты** - validation schemas, crypto, utils
3. **Integration тесты** - реальный Fastify + test DB
4. **Realtime тесты** - WebSocket

## Test Database

Используется отдельная БД: `im5_test`

Перед запуском integration тестов убедитесь, что:
- БД создана
- Миграции применены: `npm run prisma:migrate`

## Структура тестов

### Domain тесты (`test/domain/`)
- **TradeService.test.ts** - открытие сделок, валидация
- **TradeEntity.test.ts** - determineResult, calculatePayoutAmount, isExpired
- **TradeClosingService.test.ts** - закрытие сделок, WIN/LOSS логика
- **AccountService.test.ts** - create, setActive, resetDemo
- **DepositService.test.ts** - deposit validation
- **WithdrawService.test.ts** - withdraw validation
- **TimeService.test.ts** - серверное время, countdown
- **edge.test.ts** - граничные случаи

### Unit тесты (`test/unit/`)
- **validation.test.ts** - email, password, nickname, names, avatarUrl
- **crypto.test.ts** - hashPassword, verifyPassword, hashToken, generateSessionToken

### Integration тесты (`test/integration/`)
- **auth.test.ts** - регистрация, логин, cookie-based auth
- **accounts.test.ts** - GET accounts, switch, demo reset
- **trades.test.ts** - open trade, close → balance update
- **wallet.test.ts** - deposit, balance
- **user.test.ts** - profile get/update
- **instruments.test.ts** - GET instruments
- **terminal.test.ts** - snapshot
- **health.test.ts** - GET /health
- **websocket.test.ts** - subscribe, price updates

### Realtime тесты (`test/realtime/`)
- **websocket.test.ts** - подключение, события, auth

Тестируем **контракты и поведение**, а не реализацию.
