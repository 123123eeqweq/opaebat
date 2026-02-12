/**
 * Frontend logging utility.
 * - debug/warn: only in development (or when localStorage.debug is set)
 * - error: always logs (for real failures)
 */

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return isDev;
  try {
    return isDev || localStorage.getItem('debug') === '1';
  } catch {
    return isDev;
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDebugEnabled()) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDebugEnabled()) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
