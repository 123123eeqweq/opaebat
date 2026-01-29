# Backend - Binary Options Trading Platform

## FLOW 0 - Foundation

Это базовая инфраструктура проекта без бизнес-логики.

## Технологии

- **Node.js** + **TypeScript**
- **Fastify** - веб-сервер
- **PostgreSQL** - основная база данных
- **Redis** - кэш и очереди
- **Prisma** - ORM
- **WebSocket** - через @fastify/websocket

## Структура проекта

```
backend/
├── src/
│   ├── app.ts                # Fastify instance
│   ├── server.ts             # Entrypoint
│   ├── bootstrap/            # System bootstrap
│   │   ├── database.ts       # PostgreSQL connection
│   │   ├── redis.ts          # Redis connection
│   │   ├── websocket.ts      # WebSocket init
│   │   └── index.ts          # bootstrapAll()
│   ├── config/
│   │   └── env.ts            # Environment config
│   ├── domain/               # (Empty - for future flows)
│   ├── ports/                # (Empty - for future flows)
│   ├── infrastructure/       # (Empty - for future flows)
│   ├── shared/
│   │   └── logger.ts         # Logger utility
│   └── utils/
│       └── shutdown.ts       # Graceful shutdown
├── prisma/
│   └── schema.prisma         # Prisma schema (minimal)
├── package.json
├── tsconfig.json
└── .env.example
```

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Заполните переменные окружения в `.env`:
- `PORT` - порт сервера (по умолчанию 3000)
- `DATABASE_URL` - строка подключения к PostgreSQL
- `REDIS_URL` - строка подключения к Redis
- `NODE_ENV` - окружение (development/production/test)

4. Сгенерируйте Prisma Client:
```bash
npm run prisma:generate
```

## Запуск

### Development режим
```bash
npm run dev
```

### Production режим
```bash
npm run build
npm start
```

## Что делает FLOW 0

✅ Создаёт Fastify сервер  
✅ Подключается к PostgreSQL через Prisma  
✅ Подключается к Redis  
✅ Инициализирует WebSocket сервер  
✅ Настраивает graceful shutdown  
✅ Валидирует переменные окружения  

## Health Check

После запуска сервера доступен endpoint:
```
GET /health
```

Возвращает:
```json
{
  "status": "ok",
  "timestamp": "2026-01-25T12:00:00.000Z"
}
```

## Примечания

- ❌ **НЕТ** бизнес-логики
- ❌ **НЕТ** API endpoints (кроме /health)
- ❌ **НЕТ** моделей в Prisma
- ❌ **НЕТ** доменов, портов, инфраструктуры

Это только фундамент для будущих flow.
