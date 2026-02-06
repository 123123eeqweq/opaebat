/**
 * Domain tests: DepositService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DepositService } from '../../src/domain/finance/DepositService.js';
import { mockAccountRepository } from '../helpers/mocks.js';
import { mockTransactionRepository } from '../helpers/mocks.js';
import { createTestAccount } from '../helpers/factories.js';
import { AccountType } from '../../src/domain/accounts/AccountTypes.js';

describe('DepositService', () => {
  let depositService: DepositService;
  let accountRepository: ReturnType<typeof mockAccountRepository>;
  let transactionRepository: ReturnType<typeof mockTransactionRepository>;

  beforeEach(() => {
    accountRepository = mockAccountRepository();
    transactionRepository = mockTransactionRepository();
    depositService = new DepositService(accountRepository, transactionRepository);
  });

  it('should reject amount below 200', async () => {
    await expect(
      depositService.deposit({
        userId: 'user-1',
        amount: 100,
        paymentMethod: 'CARD',
      })
    ).rejects.toThrow(/200 до 1000/);
  });

  it('should reject amount above 1000', async () => {
    await expect(
      depositService.deposit({
        userId: 'user-1',
        amount: 1500,
        paymentMethod: 'CARD',
      })
    ).rejects.toThrow(/200 до 1000/);
  });

  it('should create deposit and update balance', async () => {
    const realAccount = createTestAccount({
      id: 'real-1',
      userId: 'user-1',
      type: AccountType.REAL,
      balance: 0,
    });
    accountRepository.getRealAccount = async () => realAccount;
    transactionRepository.create = async (data) => ({
      ...data,
      id: 'tx-1',
      createdAt: new Date(),
      confirmedAt: null,
    } as any);
    transactionRepository.confirm = async () => {};
    transactionRepository.findById = async () => ({
      id: 'tx-1',
      userId: 'user-1',
      accountId: 'real-1',
      type: 'DEPOSIT',
      status: 'CONFIRMED',
      amount: 200,
      currency: 'UAH',
      paymentMethod: 'CARD',
      provider: 'manual',
      createdAt: new Date(),
      confirmedAt: new Date(),
    } as any);
    accountRepository.updateBalance = async (id, delta) => {
      expect(id).toBe('real-1');
      expect(delta).toBe(200);
      return { ...realAccount, balance: 200 } as any;
    };

    const result = await depositService.deposit({
      userId: 'user-1',
      amount: 200,
      paymentMethod: 'CARD',
    });

    expect(result.amount).toBe(200);
    expect(result.status).toBe('CONFIRMED');
  });
});
