/**
 * Cookie authentication adapter
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Set session cookie
 */
export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Get session token from cookie
 */
export function getSessionToken(request: FastifyRequest): string | null {
  return request.cookies[COOKIE_NAME] || null;
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
}
