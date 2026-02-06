/**
 * Request ID middleware for request tracing
 * 
 * Adds a unique request ID to each request for tracking and debugging purposes.
 * Uses X-Request-ID header if provided by client, otherwise generates a new UUID.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Use existing X-Request-ID header if provided, otherwise generate new UUID
  const requestId = (request.headers['x-request-id'] as string) || randomUUID();
  
  // Attach request ID to request object for use in handlers and error logging
  (request as FastifyRequest & { id: string }).id = requestId;
  
  // Return request ID in response header for client tracking
  reply.header('X-Request-ID', requestId);
}
