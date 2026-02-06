/**
 * Wallet validation schemas using Zod
 * 
 * Provides type-safe validation for wallet-related endpoints
 */

import { z } from 'zod';

/**
 * Payment method enum values
 */
export const paymentMethodEnum = z.enum([
  'CARD',
  'CRYPTO',
  'BANK',
  'APPLE_PAY',
  'GOOGLE_PAY',
  'PAYPAL',
  'QIWI',
  'YOOMONEY',
  'WEBMONEY',
  'SKRILL',
  'NETELLER',
  'ADVANCED_CASH',
  'SBP',
], { message: 'Invalid payment method' });

/**
 * Schema for deposit transaction
 */
export const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive').min(200, 'Minimum deposit is 200').max(1000, 'Maximum deposit is 1000'),
  paymentMethod: paymentMethodEnum,
});

export type DepositInput = z.infer<typeof depositSchema>;

/**
 * Schema for withdrawal transaction
 */
export const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive').min(200, 'Minimum withdrawal is 200').max(1000, 'Maximum withdrawal is 1000'),
  paymentMethod: paymentMethodEnum,
  destination: z.string().min(1, 'Destination is required'), // wallet address, card number, etc.
});

export type WithdrawInput = z.infer<typeof withdrawSchema>;
