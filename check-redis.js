/**
 * Временный скрипт для проверки подключения к Redis.
 * Запуск: node check-redis.js
 */

const net = require('net');

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = parseInt(process.env.REDIS_PORT || '6379', 10);

const client = new net.Socket();
const timeout = 3000;

client.setTimeout(timeout);

client.connect(port, host, () => {
  console.log('\x1b[32m✓ Redis доступен\x1b[0m');
  console.log(`  ${host}:${port}`);
  client.destroy();
  process.exit(0);
});

client.on('error', (err) => {
  console.error('\x1b[31m✗ Нет подключения к Redis\x1b[0m');
  console.error(`  ${host}:${port}`);
  console.error(`  Ошибка: ${err.message}`);
  process.exit(1);
});

client.on('timeout', () => {
  console.error('\x1b[31m✗ Таймаут подключения к Redis\x1b[0m');
  client.destroy();
  process.exit(1);
});
