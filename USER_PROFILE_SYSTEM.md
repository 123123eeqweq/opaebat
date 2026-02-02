# 👤 USER_PROFILE_SYSTEM.md — Система профиля пользователя

## 📋 Содержание

1. [Текущее состояние](#текущее-состояние)
2. [Реализовано (FLOW U1)](#реализовано-flow-u1---base-user-profile)
3. [Frontend UI (что уже есть)](#frontend-ui-что-уже-есть)
4. [Что нужно реализовать (будущие фазы)](#что-нужно-реализовать-будущие-фазы)
5. [Архитектура](#архитектура)
6. [API Endpoints](#api-endpoints)
7. [База данных](#база-данных)
8. [Безопасность](#безопасность)

---

## 🟢 Текущее состояние

### Backend

#### ✅ Что уже реализовано:

1. **User Model (Prisma)**
   ```prisma
   model User {
     id        String   @id @default(uuid())
     email     String   @unique
     password  String   // hashed
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
     
     // FLOW U1: Base Profile fields
     firstName   String?
     lastName    String?
     nickname    String?   @unique
     phone       String?   @unique
     country     String?
     dateOfBirth DateTime?
     avatarUrl   String?
     
     sessions Session[]
     accounts Account[]
     trades   Trade[]
   }
   ```

2. **Auth System**
   - ✅ Регистрация (`POST /api/auth/register`)
   - ✅ Вход (`POST /api/auth/login`)
   - ✅ Выход (`POST /api/auth/logout`)
   - ✅ Получение текущего пользователя (`GET /api/auth/me`)
   - ✅ Хеширование паролей (bcrypt)
   - ✅ Сессии (30 дней, cookie-based)

3. **Session System**
   ```prisma
   model Session {
     id        String   @id @default(cuid())
     userId    String
     tokenHash String   @unique
     expiresAt DateTime
     createdAt DateTime @default(now())
   }
   ```

4. **Repositories**
   - ✅ `UserRepository` (findByEmail, findById, create, findByPhone, findByNickname, updateProfile, getProfile)
   - ✅ `SessionRepository` (create, findByToken, deleteByToken)

5. **Domain Services**
   - ✅ `AuthService` (register, login, logout, getMe)
   - ✅ `UserService` (getProfile, updateProfile)
     - Валидация уникальности nickname и phone
     - Обработка ошибок: `NicknameAlreadyTakenError`, `PhoneAlreadyTakenError`, `UserNotFoundError`

6. **User Profile API (FLOW U1)**
   - ✅ `GET /api/user/profile` - получение профиля текущего пользователя
   - ✅ `PATCH /api/user/profile` - обновление профиля
     - Поддерживаемые поля: `firstName`, `lastName`, `nickname`, `phone`, `country`, `dateOfBirth`, `avatarUrl`
     - Валидация через Fastify schema
     - Проверка уникальности phone и nickname
   - ✅ `POST /api/user/avatar` - загрузка аватара (multipart/form-data)
   - ✅ `DELETE /api/user/avatar` - удаление аватара

---

## 🎨 Frontend UI (что уже есть)

### Страница профиля (`/profile`)

#### Tab "Профиль" (`TabProfile`)

**Левая колонка:**

1. **User Profile Card**
   - Аватар (placeholder)
   - Статус "Verified"
   - Кнопка редактирования аватара
   - Имя пользователя
   - ID пользователя
   - Бейджи: LEVEL Standard, REGION UKR

2. **Contact Info**
   - Email Address (с статусом "Verified")
   - Phone Number (с кнопкой "CHANGE")
   - Маскированный номер: `+380 99 ***** 99`

3. **Last Login**
   - Операционная система (Windows 10)
   - Ссылка на детали

**Правая колонка:**

1. **Personal Data**
   - **Basic Information:**
     - First Name (input)
     - Last Name (input)
     - Nickname (input с @)
     - Date of Birth (input DD.MM.YYYY)
   - **Location Details:**
     - Country (select: Ukraine, Russia, Other)
     - City (input)
     - Residential Address (input)
   - Кнопка "Save Changes"

2. **Security Status & Verification** (grid 2 колонки)
   - **Security Status:**
     - Protection Level: 85%
     - Прогресс-бар
     - Предупреждение: "Enable 2FA to reach 100% security"
     - Password статус (Last changed 3 months ago)
     - Кнопка "Update" пароля
   - **Verification:**
     - Step 2 of 3
     - ✅ Confirm Email (Completed on Oct 24)
     - 🔵 Identity Check (Upload Passport or ID)
     - Кнопка загрузки документа (Max size 5MB)

#### Tab "Кошелёк" (`TabWallet`)
- Выбор метода оплаты (Card, Crypto, Bank Wire)
- Ввод суммы депозита
- Промо-код
- Summary с итоговой суммой

#### Tab "Торговля" (`TabTrade`)
- Статистика торговли
- График прибыли
- Trade Extremes

#### Tab "Поддержка" (`TabSupport`)
- Поиск по базе знаний
- Категории помощи (Account Management, Deposits, Trading, Markets, Education, Security)

---

## ✅ Реализовано (FLOW U1 - Base User Profile)

### 1. Расширение User Model ✅

#### Поля в Prisma (уже реализованы):

```prisma
model User {
  // Существующие поля
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // FLOW U1: Base Profile fields (РЕАЛИЗОВАНО)
  firstName   String?
  lastName    String?
  nickname    String?   @unique
  phone       String?   @unique
  country     String?
  dateOfBirth DateTime?
  avatarUrl   String?
  
  // Верификация (пока не реализовано)
  emailVerified      Boolean   @default(false)
  emailVerifiedAt    DateTime?
  phoneVerified     Boolean   @default(false)
  phoneVerifiedAt    DateTime?
  
  // 2FA
  twoFactorEnabled   Boolean   @default(false)
  twoFactorSecret    String?   // TOTP secret (encrypted)
  twoFactorBackupCodes String[] // Backup codes (encrypted)
  
  // KYC/AML
  kycStatus          KycStatus @default(PENDING)
  kycDocuments       KycDocument[]
  
  // Отношения
  sessions Session[]
  accounts Account[]
  trades   Trade[]
}

enum KycStatus {
  PENDING
  IN_REVIEW
  VERIFIED
  REJECTED
}

model KycDocument {
  id          String   @id @default(uuid())
  userId      String
  type        DocumentType
  fileUrl     String
  status      DocumentStatus @default(PENDING)
  reviewedAt  DateTime?
  reviewedBy  String?
  rejectionReason String?
  createdAt   DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("kyc_documents")
}

enum DocumentType {
  PASSPORT
  ID_CARD
  DRIVER_LICENSE
  UTILITY_BILL
  BANK_STATEMENT
}

enum DocumentStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### 2. API Endpoints для профиля

#### ✅ 2.1. Получение профиля (РЕАЛИЗОВАНО)

```
GET /api/user/profile
Authorization: Cookie (session)

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "nickname": "@johndoe",
    "dateOfBirth": "1990-01-01T00:00:00Z",
    "country": "Ukraine",
    "phone": "+380991234567",
    "avatarUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Реализация:**
- ✅ `UserController.getProfile()`
- ✅ `UserService.getProfile()`
- ✅ `UserRepository.getProfile()`
- ✅ Возвращает все поля профиля (включая null значения)

#### ✅ 2.2. Обновление профиля (РЕАЛИЗОВАНО)

```
PATCH /api/user/profile
Authorization: Cookie (session)
Content-Type: application/json

Body (все поля опциональны):
{
  "firstName": "John",
  "lastName": "Doe",
  "nickname": "@johndoe",
  "dateOfBirth": "1990-01-01",  // ISO date string
  "country": "Ukraine",
  "phone": "+380991234567",      // E.164 format
  "avatarUrl": "https://..."
}

Response:
{
  "user": { ... }
}

Ошибки:
- 409 Conflict: "Nickname already taken" (если nickname занят)
- 409 Conflict: "Phone already taken" (если phone занят)
- 404 Not Found: "User not found"
```

**Реализация:**
- ✅ `UserController.updateProfile()`
- ✅ `UserService.updateProfile()` с валидацией уникальности
- ✅ `UserRepository.updateProfile()`
- ✅ Валидация через Fastify schema (`user.schema.ts`)
- ✅ Проверка уникальности `nickname` и `phone`
- ✅ Обработка ошибок: `NicknameAlreadyTakenError`, `PhoneAlreadyTakenError`

#### ✅ 2.3. Загрузка аватара (РЕАЛИЗОВАНО)

```
POST /api/user/avatar
Authorization: Cookie (session)
Content-Type: multipart/form-data

Body:
{
  "file": File  // Изображение (JPG, PNG, WebP)
}

Response:
{
  "user": {
    "avatarUrl": "https://..."
  }
}
```

#### ✅ 2.4. Удаление аватара (РЕАЛИЗОВАНО)

```
DELETE /api/user/avatar
Authorization: Cookie (session)

Response:
{
  "user": {
    "avatarUrl": null
  }
}
```

#### 2.3. Смена пароля

```
POST /api/user/change-password
Authorization: Cookie (session)

Body:
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}

Response:
{
  "message": "Password changed successfully"
}
```

#### 2.4. Смена email

```
POST /api/user/change-email
Authorization: Cookie (session)

Body:
{
  "newEmail": "newemail@example.com",
  "password": "currentPassword123"
}

Response:
{
  "message": "Email change request sent. Please verify your new email.",
  "verificationToken": "token..."
}
```

#### 2.5. Верификация email

```
POST /api/user/verify-email
Authorization: Cookie (session)

Body:
{
  "token": "verification-token"
}

Response:
{
  "message": "Email verified successfully"
}
```

#### 2.6. Отправка кода верификации email

```
POST /api/user/send-email-verification
Authorization: Cookie (session)

Response:
{
  "message": "Verification code sent to your email"
}
```

#### 2.7. Смена телефона

```
POST /api/user/change-phone
Authorization: Cookie (session)

Body:
{
  "phone": "+380991234567",
  "password": "currentPassword123"
}

Response:
{
  "message": "Verification code sent to your phone",
  "verificationId": "uuid"
}
```

#### 2.8. Верификация телефона

```
POST /api/user/verify-phone
Authorization: Cookie (session)

Body:
{
  "verificationId": "uuid",
  "code": "123456"
}

Response:
{
  "message": "Phone verified successfully"
}
```

#### 2.9. Отправка кода верификации телефона

```
POST /api/user/send-phone-verification
Authorization: Cookie (session)

Response:
{
  "message": "Verification code sent to your phone",
  "verificationId": "uuid"
}
```

### 3. 2FA (Two-Factor Authentication)

#### 3.1. Генерация QR-кода для 2FA

```
POST /api/user/2fa/setup
Authorization: Cookie (session)

Response:
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "backupCodes": [
    "ABCD-1234-EFGH-5678",
    "IJKL-9012-MNOP-3456",
    ...
  ]
}
```

#### 3.2. Включение 2FA

```
POST /api/user/2fa/enable
Authorization: Cookie (session)

Body:
{
  "code": "123456"  // TOTP code from authenticator app
}

Response:
{
  "message": "2FA enabled successfully",
  "backupCodes": [...]
}
```

#### 3.3. Отключение 2FA

```
POST /api/user/2fa/disable
Authorization: Cookie (session)

Body:
{
  "password": "currentPassword123",
  "code": "123456"  // TOTP code
}

Response:
{
  "message": "2FA disabled successfully"
}
```

#### 3.4. Проверка 2FA кода (для логина)

```
POST /api/auth/login
Body:
{
  "email": "user@example.com",
  "password": "password123",
  "twoFactorCode": "123456"  // если 2FA включен
}
```

#### 3.5. Генерация новых backup кодов

```
POST /api/user/2fa/regenerate-backup-codes
Authorization: Cookie (session)

Body:
{
  "password": "currentPassword123"
}

Response:
{
  "backupCodes": [...]
}
```

### 4. Управление сессиями

#### 4.1. Получение списка активных сессий

```
GET /api/user/sessions
Authorization: Cookie (session)

Response:
{
  "sessions": [
    {
      "id": "session-id",
      "device": "Windows 10",
      "browser": "Chrome 120.0",
      "ip": "192.168.1.1",
      "location": "Kyiv, Ukraine",
      "lastActivity": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "isCurrent": true
    },
    ...
  ]
}
```

#### 4.2. Удаление сессии

```
DELETE /api/user/sessions/:sessionId
Authorization: Cookie (session)

Response:
{
  "message": "Session deleted successfully"
}
```

#### 4.3. Удаление всех сессий (кроме текущей)

```
DELETE /api/user/sessions
Authorization: Cookie (session)

Response:
{
  "message": "All other sessions deleted successfully"
}
```

### 5. KYC/AML (Верификация документов)

#### 5.1. Загрузка документа

```
POST /api/user/kyc/upload-document
Authorization: Cookie (session)
Content-Type: multipart/form-data

Body:
{
  "type": "PASSPORT",  // PASSPORT, ID_CARD, DRIVER_LICENSE, UTILITY_BILL, BANK_STATEMENT
  "file": File
}

Response:
{
  "document": {
    "id": "uuid",
    "type": "PASSPORT",
    "status": "PENDING",
    "fileUrl": "https://...",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 5.2. Получение статуса KYC

```
GET /api/user/kyc/status
Authorization: Cookie (session)

Response:
{
  "status": "VERIFIED",
  "documents": [
    {
      "id": "uuid",
      "type": "PASSPORT",
      "status": "APPROVED",
      "fileUrl": "https://...",
      "reviewedAt": "2024-01-15T10:30:00Z"
    },
    ...
  ]
}
```

#### 5.3. Удаление документа

```
DELETE /api/user/kyc/documents/:documentId
Authorization: Cookie (session)

Response:
{
  "message": "Document deleted successfully"
}
```

### 6. Загрузка аватара

```
POST /api/user/avatar
Authorization: Cookie (session)
Content-Type: multipart/form-data

Body:
{
  "file": File  // Max 5MB, JPG/PNG
}

Response:
{
  "avatarUrl": "https://..."
}
```

#### Удаление аватара

```
DELETE /api/user/avatar
Authorization: Cookie (session)

Response:
{
  "message": "Avatar deleted successfully"
}
```

---

## 🏗️ Архитектура

### Структура модулей

```
backend/src/
├── modules/
│   └── user/
│       ├── user.controller.ts      # HTTP handlers
│       ├── user.routes.ts          # Fastify routes
│       ├── user.schema.ts          # Request/response schemas
│       └── user.middleware.ts      # Validation, file upload
├── domain/
│   └── user/
│       ├── UserService.ts          # Business logic
│       ├── UserTypes.ts            # Domain types
│       ├── UserErrors.ts           # Domain errors
│       ├── TwoFactorService.ts     # 2FA logic
│       └── KycService.ts           # KYC logic
├── ports/
│   └── repositories/
│       ├── UserRepository.ts       # Interface (расширить)
│       └── SessionRepository.ts    # Interface (расширить)
└── infrastructure/
    ├── prisma/
    │   ├── PrismaUserRepository.ts  # Реализация (расширить)
    │   └── PrismaSessionRepository.ts # Реализация (расширить)
    ├── storage/
    │   ├── FileStorage.ts           # Загрузка файлов (S3/Local)
    │   └── ImageProcessor.ts        # Обработка изображений
    └── sms/
        └── SmsProvider.ts           # Отправка SMS (Twilio/SMS.ru)
```

### ✅ Расширение UserRepository (РЕАЛИЗОВАНО)

```typescript
export interface UserRepository {
  // Существующие методы
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  
  // FLOW U1: Реализованные методы профиля
  ✅ updateProfile(userId: string, data: Partial<UserProfileData>): Promise<User>;
  ✅ getProfile(userId: string): Promise<User | null>;
  ✅ findByNickname(nickname: string): Promise<User | null>;
  ✅ findByPhone(phone: string): Promise<User | null>;
  
  // Будущие методы (не реализовано)
  updatePassword(id: string, passwordHash: string): Promise<void>;
}
```

**Реализация:** `PrismaUserRepository` в `backend/src/infrastructure/prisma/PrismaUserRepository.ts`

### Расширение SessionRepository

```typescript
export interface SessionRepository {
  // Существующие методы
  create(sessionData: Omit<Session, 'id' | 'createdAt'>): Promise<Session>;
  findByToken(tokenHash: string): Promise<Session | null>;
  deleteByToken(tokenHash: string): Promise<void>;
  
  // НОВЫЕ методы
  findByUserId(userId: string): Promise<Session[]>;
  deleteById(sessionId: string): Promise<void>;
  deleteAllByUserId(userId: string, excludeSessionId?: string): Promise<void>;
  updateLastActivity(sessionId: string): Promise<void>;
}
```

---

## 🗄️ База данных

### ✅ Текущая схема (FLOW U1)

**User Model:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // FLOW U1: Base Profile fields (РЕАЛИЗОВАНО)
  firstName   String?
  lastName    String?
  nickname    String?   @unique
  phone       String?   @unique
  country     String?
  dateOfBirth DateTime?
  avatarUrl   String?

  sessions Session[]
  accounts Account[]
  trades   Trade[]
}
```

**Индексы:**
- ✅ `email` - уникальный индекс
- ✅ `nickname` - уникальный индекс (если не null)
- ✅ `phone` - уникальный индекс (если не null)

**Ограничения:**
- ✅ Email обязателен и уникален
- ✅ Nickname уникален (если указан)
- ✅ Phone уникален (если указан), формат E.164

---

### 🔴 Будущие расширения

### Миграция для расширения User

```prisma
// migration.sql (пример)

ALTER TABLE users ADD COLUMN "firstName" TEXT;
ALTER TABLE users ADD COLUMN "lastName" TEXT;
ALTER TABLE users ADD COLUMN "nickname" TEXT UNIQUE;
ALTER TABLE users ADD COLUMN "dateOfBirth" TIMESTAMP;
ALTER TABLE users ADD COLUMN "country" TEXT;
ALTER TABLE users ADD COLUMN "city" TEXT;
ALTER TABLE users ADD COLUMN "address" TEXT;
ALTER TABLE users ADD COLUMN "phone" TEXT UNIQUE;
ALTER TABLE users ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE users ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN "emailVerifiedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN "phoneVerified" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN "phoneVerifiedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN "twoFactorEnabled" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE users ADD COLUMN "twoFactorBackupCodes" TEXT[];
ALTER TABLE users ADD COLUMN "kycStatus" TEXT DEFAULT 'PENDING';

CREATE TABLE kyc_documents (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP,
  "reviewedBy" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kyc_documents_user_id ON kyc_documents("userId");
```

### Расширение Session для отслеживания устройств

```prisma
model Session {
  id           String   @id @default(cuid())
  userId       String
  tokenHash    String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  // НОВЫЕ поля
  device       String?  // "Windows 10", "iPhone 15"
  browser      String?  // "Chrome 120.0", "Safari 17.0"
  ip           String?
  userAgent    String?
  lastActivity DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("sessions")
}
```

---

## 🔒 Безопасность

### ✅ Текущая реализация (FLOW U1)

**Валидация:**
- ✅ Валидация формата `phone` (E.164: `+[1-9][0-9]{1,14}`)
- ✅ Валидация формата `nickname` (pattern: `^@[a-zA-Z0-9_]{3,30}$`)
- ✅ Проверка уникальности `nickname` и `phone`
- ✅ Валидация `dateOfBirth` (ISO date format)
- ✅ Валидация `avatarUrl` (URI format)

**Ошибки:**
- ✅ `NicknameAlreadyTakenError` - если nickname уже занят
- ✅ `PhoneAlreadyTakenError` - если phone уже занят
- ✅ `UserNotFoundError` - если пользователь не найден

**Авторизация:**
- ✅ Все endpoints требуют аутентификации (cookie-based session)
- ✅ Пользователь может обновлять только свой профиль

---

### 🔴 Будущие улучшения безопасности

### 1. Валидация данных

- **Email**: формат email, уникальность
- **Phone**: формат E.164 (+380991234567), уникальность
- **Nickname**: уникальность, формат (@username), длина 3-30 символов
- **Password**: минимум 8 символов, сложность (буквы, цифры, спецсимволы)
- **Date of Birth**: возраст >= 18 лет
- **File uploads**: размер (макс 5MB), тип (JPG, PNG, PDF)

### 2. Rate Limiting

- Смена пароля: 3 попытки в час
- Отправка кодов верификации: 5 попыток в час
- Вход с 2FA: 5 попыток в 15 минут
- Загрузка документов: 10 файлов в день

### 3. Шифрование

- **2FA Secret**: шифровать в БД (AES-256)
- **Backup Codes**: хешировать перед сохранением
- **Phone**: маскировать в ответах API (показывать только последние 2 цифры)

### 4. Логирование

- Все изменения профиля
- Попытки смены пароля
- Включение/отключение 2FA
- Загрузка KYC документов
- Удаление сессий

### 5. Email/SMS верификация

- **Email**: отправка кода через SMTP (Nodemailer)
- **SMS**: отправка через провайдера (Twilio, SMS.ru)
- Коды верификации: 6 цифр, срок действия 10 минут
- Хранение кодов: Redis с TTL 10 минут

---

## 📝 Чеклист реализации

### Фаза 1: Базовая функциональность профиля
- [ ] Расширить User модель в Prisma
- [ ] Создать миграцию БД
- [ ] Расширить UserRepository
- [ ] Создать UserService
- [ ] API: GET /api/user/profile
- [ ] API: PATCH /api/user/profile
- [ ] Обновить фронтенд для сохранения данных

### Фаза 2: Безопасность
- [ ] API: POST /api/user/change-password
- [ ] API: POST /api/user/change-email
- [ ] API: POST /api/user/verify-email
- [ ] API: POST /api/user/send-email-verification
- [ ] Интеграция с SMTP для отправки email

### Фаза 3: Телефон
- [ ] API: POST /api/user/change-phone
- [ ] API: POST /api/user/verify-phone
- [ ] API: POST /api/user/send-phone-verification
- [ ] Интеграция с SMS провайдером

### Фаза 4: 2FA
- [ ] Установить библиотеку для TOTP (speakeasy, otplib)
- [ ] Создать TwoFactorService
- [ ] API: POST /api/user/2fa/setup
- [ ] API: POST /api/user/2fa/enable
- [ ] API: POST /api/user/2fa/disable
- [ ] API: POST /api/user/2fa/regenerate-backup-codes
- [ ] Обновить AuthService для проверки 2FA при логине
- [ ] Frontend: QR-код генерация и отображение

### Фаза 5: Сессии
- [ ] Расширить Session модель (device, browser, IP)
- [ ] Расширить SessionRepository
- [ ] API: GET /api/user/sessions
- [ ] API: DELETE /api/user/sessions/:sessionId
- [ ] API: DELETE /api/user/sessions
- [ ] Middleware для отслеживания device/browser/IP

### Фаза 6: KYC/AML
- [ ] Создать KycDocument модель
- [ ] Создать KycService
- [ ] Настроить файловое хранилище (S3 или локальное)
- [ ] API: POST /api/user/kyc/upload-document
- [ ] API: GET /api/user/kyc/status
- [ ] API: DELETE /api/user/kyc/documents/:documentId
- [ ] Валидация файлов (размер, тип)

### Фаза 7: Аватар
- [ ] API: POST /api/user/avatar
- [ ] API: DELETE /api/user/avatar
- [ ] Обработка изображений (resize, crop)
- [ ] Frontend: загрузка и отображение аватара

---

## 🔗 Связанные файлы

### Backend
- `backend/prisma/schema.prisma` — модель User
- `backend/src/modules/auth/` — текущая auth система
- `backend/src/domain/auth/AuthService.ts` — бизнес-логика auth
- `backend/src/ports/repositories/UserRepository.ts` — интерфейс репозитория
- `backend/src/infrastructure/prisma/PrismaUserRepository.ts` — реализация

### Frontend
- `frontend/app/profile/page.tsx` — страница профиля
- `frontend/components/auth/AuthGuard.tsx` — защита роутов

---

**Последнее обновление:** 2026-01-30  
**Версия:** 1.0
