/**
 * Zod body validation preHandler for Fastify
 * Parses and validates request.body, replaces with sanitized result
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsed = schema.parse(request.body);
      (request as FastifyRequest & { body: T }).body = parsed;
    } catch (err) {
      return reply.status(400).send({
        error: 'Validation failed',
        message: err instanceof Error ? err.message : 'Invalid request body',
        details: err && typeof err === 'object' && 'issues' in err ? (err as { issues: unknown }).issues : undefined,
      });
    }
  };
}
