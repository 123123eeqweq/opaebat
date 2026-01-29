/**
 * Accounts request/response schemas for Fastify
 */

export const getAccountsSchema = {
  // No body required
} as const;

export const createAccountSchema = {
  body: {
    type: 'object',
    required: ['type'],
    properties: {
      type: {
        type: 'string',
        enum: ['demo', 'real'],
      },
    },
  },
} as const;

export const switchAccountSchema = {
  body: {
    type: 'object',
    required: ['accountId'],
    properties: {
      accountId: {
        type: 'string',
      },
    },
  },
} as const;
