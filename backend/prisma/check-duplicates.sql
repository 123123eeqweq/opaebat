-- Проверка дубликатов перед миграцией
-- Запустите этот скрипт в PostgreSQL, чтобы проверить наличие дубликатов

-- Проверка дубликатов nickname (исключая NULL)
SELECT nickname, COUNT(*) as count
FROM users
WHERE nickname IS NOT NULL
GROUP BY nickname
HAVING COUNT(*) > 1;

-- Проверка дубликатов phone (исключая NULL)
SELECT phone, COUNT(*) as count
FROM users
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;

-- Если оба запроса вернули 0 строк - можно смело делать миграцию
-- Если есть дубликаты - нужно их исправить перед миграцией
