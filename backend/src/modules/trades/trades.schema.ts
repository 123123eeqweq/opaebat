/**
 * Trades request/response schemas for Fastify
 */

export const openTradeSchema = {
  body: {
    type: 'object',
    required: ['accountId', 'direction', 'amount', 'expirationSeconds'],
    properties: {
      accountId: {
        type: 'string',
      },
      direction: {
        type: 'string',
        enum: ['CALL', 'PUT'],
      },
      amount: {
        type: 'number',
        minimum: 0.01,
      },
      expirationSeconds: {
        type: 'number',
        minimum: 5,
        maximum: 300,
        multipleOf: 5,
      },
    },
  },
} as const;

export const getTradesSchema = {
  // No body required
} as const;
