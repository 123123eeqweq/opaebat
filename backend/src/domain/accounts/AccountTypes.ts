/**
 * Domain types for Accounts
 */

export enum AccountType {
  DEMO = 'demo',
  REAL = 'real',
}

export interface Account {
  id: string;
  userId: string;
  type: AccountType;
  balance: number; // Decimal as number for domain
  currency: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateAccountInput {
  userId: string;
  type: AccountType;
}

export interface AccountDTO {
  id: string;
  type: AccountType;
  balance: string; // Decimal as string for API
  currency: string;
  isActive: boolean;
}
