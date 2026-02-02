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
        minimum: 10,
        description: 'Deposit amount (minimum $10)',
      },
      paymentMethod: {
        type: 'string',
        enum: ['CARD', 'CRYPTO', 'BANK'],
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
