/**
 * Global error handler for Fastify
 * 
 * All domain errors extend AppError with statusCode and code.
 * Centralizes error handling logic and provides consistent error responses.
 */

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../shared/logger.js';
import { AppError } from '../shared/errors/AppError.js';
import { env } from '../config/env.js';

/**
 * Format Zod validation errors for API response
 */
function formatZodError(zodError: ZodError) {
  const details: Record<string, string[]> = {};
  
  zodError.issues.forEach((issue) => {
    const path = issue.path.length > 0 ? String(issue.path.join('.')) : 'root';
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  });

  return {
    error: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details,
  };
}

/**
 * Global error handler for Fastify
 */
export async function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Structured log with correlation
  logger.error(
    {
      err: error,
      requestId: (request as { id?: string }).id,
      url: request.url,
      method: request.method,
      userId: (request as { userId?: string }).userId,
      statusCode: error instanceof AppError ? error.statusCode : undefined,
    },
    'Request error',
  );

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send(formatZodError(error));
  }

  // Handle AppError (includes all domain errors: Auth, Account, Trade, User)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code ?? 'ERROR',
      message: error.message,
    });
  }

  // Handle Fastify validation errors
  const fastifyErr = error as FastifyError;
  if ('validation' in fastifyErr && fastifyErr.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: fastifyErr.validation,
    });
  }

  // Handle Fastify HTTP errors (404, etc.)
  if (fastifyErr.statusCode != null) {
    return reply.status(fastifyErr.statusCode).send({
      error: 'HTTP_ERROR',
      message: fastifyErr.message || 'An error occurred',
    });
  }

  // Default: Internal server error
  const isProduction = env.NODE_ENV === 'production';
  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: isProduction ? 'An internal server error occurred' : error.message,
    ...(isProduction ? {} : { stack: error.stack }),
  });
}
