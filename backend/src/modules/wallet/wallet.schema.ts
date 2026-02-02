/**
 * Wallet request/response schemas for Fastify
 * 🔥 FLOW W1: Deposit endpoints
 */

export const depositSchema = {
  body: {
    type: 'object',
    required: ['amount', 'paymentMethod'],
    properties: {
      amount: {
        type: 'number',
        minimum: 200,
        maximum: 1000,
        description: 'Deposit amount (200–1000 UAH)',
      },
      paymentMethod: {
        type: 'string',
        enum: ['CARD', 'CRYPTO', 'BANK', 'APPLE_PAY', 'GOOGLE_PAY', 'PAYPAL', 'QIWI', 'YOOMONEY', 'WEBMONEY', 'SKRILL', 'NETELLER', 'ADVANCED_CASH', 'SBP'],
        description: 'Payment method',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        transactionId: { type: 'string' },
        status: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
      },
    },
  },
} as const;

export const withdrawSchema = {
  body: {
    type: 'object',
    required: ['amount', 'paymentMethod'],
    properties: {
      amount: { type: 'number', minimum: 200, maximum: 1000, description: 'Withdrawal amount (200–1000 UAH)' },
      paymentMethod: {
        type: 'string',
        enum: ['CARD', 'CRYPTO', 'BANK'],
        description: 'Withdrawal method',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        transactionId: { type: 'string' },
        status: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
      },
    },
  },
} as const;

export const getBalanceSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        currency: { type: 'string' },
        balance: { type: 'number' },
      },
    },
  },
} as const;
