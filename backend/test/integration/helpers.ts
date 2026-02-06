/**
 * Integration test helpers - auth, cookies
 */

import type { FastifyInstance } from 'fastify';

export interface AuthCookie {
  name: string;
  value: string;
}

/** Register user and return session cookie for authenticated requests */
export async function registerAndGetCookie(
  app: FastifyInstance,
  email?: string,
  password = 'Password123'
): Promise<AuthCookie | null> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: email ?? `test-${Date.now()}@example.com`,
      password,
    },
  });

  if (response.statusCode !== 201) return null;
  const cookie = response.cookies.find((c) => c.name === 'session');
  return cookie ? { name: cookie.name, value: cookie.value } : null;
}

/** Build Cookie header value from auth cookie */
export function cookieHeader(cookie: AuthCookie | null): Record<string, string> {
  if (!cookie) return {};
  return { Cookie: `${cookie.name}=${cookie.value}` };
}
