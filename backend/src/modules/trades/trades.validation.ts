/**
 * Trades validation schemas using Zod
 * 
 * Provides type-safe validation for trade-related endpoints
 */

import { z } from 'zod';

/**
 * Schema for opening a new trade
 */
export const openTradeSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'), // Account uses cuid, not uuid
  direction: z.enum(['CALL', 'PUT'], { message: 'Direction must be either CALL or PUT' }),
  amount: z.number().positive('Amount must be positive').min(0.01, 'Minimum amount is 0.01'),
  expirationSeconds: z
    .number()
    .int('Expiration must be an integer')
    .min(5, 'Minimum expiration is 5 seconds')
    .max(300, 'Maximum expiration is 300 seconds')
    .multipleOf(5, 'Expiration must be a multiple of 5'),
  instrument: z.string().min(1, 'Instrument is required'),
});

export type OpenTradeInput = z.infer<typeof openTradeSchema>;

/**
 * Schema for query parameters when getting trades
 */
export const getTradesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 25))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
  status: z.enum(['open', 'closed']).optional().default('closed'),
});

export type GetTradesQueryInput = z.infer<typeof getTradesQuerySchema>;

/**
 * Schema for date range query parameters
 */
export const dateRangeQuerySchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .refine(
        (date) => {
          const d = new Date(date);
          return !isNaN(d.getTime());
        },
        { message: 'Invalid date' }
      )
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .refine(
        (date) => {
          const d = new Date(date);
          return !isNaN(d.getTime());
        },
        { message: 'Invalid date' }
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['startDate'],
    }
  );

export type DateRangeQueryInput = z.infer<typeof dateRangeQuerySchema>;

