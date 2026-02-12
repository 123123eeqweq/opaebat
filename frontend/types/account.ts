/**
 * FLOW A-ACCOUNT: Account snapshot types
 * Backend — источник истины, Frontend — реактивная проекция
 */

export type AccountType = 'demo' | 'real';

export interface AccountSnapshot {
  accountId: string;
  type: 'REAL' | 'DEMO';
  balance: number;
  currency: 'USD' | 'RUB' | 'UAH';
  updatedAt: number;
}
