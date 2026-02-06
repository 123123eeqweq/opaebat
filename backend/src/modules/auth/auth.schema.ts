/**
 * Auth request/response schemas for Fastify
 */

export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
      },
      password: {
        type: 'string',
        minLength: 8,
        description: 'Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number',
      },
    },
  },
} as const;

export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
      },
      password: {
        type: 'string',
      },
    },
  },
} as const;

export const logoutSchema = {
  body: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
} as const;

export const meSchema = {
  // No body required
} as const;
