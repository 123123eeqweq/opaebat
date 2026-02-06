/**
 * Structured logger using Pino
 * JSON output for production, pretty for development
 * Compatible with (msg, ...args) and (obj, msg) signatures
 */

import pino from 'pino';
import { env } from '../config/env.js';

const pinoLogger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,env',
            colorize: true,
          },
        },
      }
    : {}),
  base: {
    env: env.NODE_ENV,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Wrapper for compatibility with existing (msg, err) and (obj, msg) usage
export const logger = {
  info: (msgOrObj: string | object, ...args: unknown[]) => {
    if (typeof msgOrObj === 'object') {
      pinoLogger.info(msgOrObj, (args[0] as string) || '');
    } else {
      pinoLogger.info(msgOrObj);
    }
  },
  warn: (msgOrObj: string | object, ...args: unknown[]) => {
    if (typeof msgOrObj === 'object') {
      pinoLogger.warn(msgOrObj, (args[0] as string) || '');
    } else {
      pinoLogger.warn(msgOrObj);
    }
  },
  error: (msgOrObj: string | object, ...args: unknown[]) => {
    if (typeof msgOrObj === 'object') {
      pinoLogger.error(msgOrObj, (args[0] as string) || 'Error');
    } else if (args[0] instanceof Error) {
      pinoLogger.error({ err: args[0] }, msgOrObj);
    } else {
      pinoLogger.error(msgOrObj);
    }
  },
  debug: (msgOrObj: string | object, ...args: unknown[]) => {
    if (typeof msgOrObj === 'object') {
      pinoLogger.debug(msgOrObj, (args[0] as string) || '');
    } else {
      pinoLogger.debug(msgOrObj);
    }
  },
};
