/**
 * Domain tests: WithdrawService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WithdrawService } from '../../src/domain/finance/WithdrawService.js';
import { mockAccountRepository } from '../helpers/mocks.js';
import { mockTransactionRepository } from '../helpers/mocks.js';
import { createTestAccount } from '../helpers/factories.js';
import { AccountType } from '../../src/domain/accounts/AccountTypes.js';

describe('WithdrawService', () => {
  let withdrawService: WithdrawService;
  let accountRepository: ReturnType<typeof mockAccountRepository>;
  let transactionRepository: ReturnType<typeof mockTransactionRepository>;

  beforeEach(() => {
    accountRepository = mockAccountRepository();
    transactionRepository = mockTransactionRepository();
    withdrawService = new WithdrawService(accountRepository, transactionRepository);
  });

  it('should reject amount below 200', async () => {
    await expect(
      withdrawService.withdraw({
        userId: 'user-1',
        amount: 100,
        paymentMethod: 'CARD',
      })
    ).rejects.toThrow(/200 до 1000/);
  });

  it('should reject amount above 1000', async () => {
    await expect(
      withdrawService.withdraw({
        userId: 'user-1',
        amount: 1500,
        paymentMethod: 'CARD',
      })
    ).rejects.toThrow(/200 до 1000/);
  });

  it('should reject when insufficient balance', async () => {
    const realAccount = createTestAccount({
      id: 'real-1',
      userId: 'user-1',
      type: AccountType.REAL,
    });
    accountRepository.getRealAccount = async () => realAccount;
    transactionRepository.getBalance = async () => 100; // Less than 200

    await expect(
      withdrawService.withdraw({
        userId: 'user-1',
        amount: 200,
        paymentMethod: 'CARD',
      })
    ).rejects.toThrow('Insufficient balance');
  });

  it('should create withdraw and deduct balance', async () => {
    const realAccount = createTestAccount({
      id: 'real-1',
      userId: 'user-1',
      type: AccountType.REAL,
      balance: 500,
    });
    accountRepository.getRealAccount = async () => realAccount;
    transactionRepository.getBalance = async () => 500;
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
      type: 'WITHDRAW',
      status: 'CONFIRMED',
      amount: -200,
      currency: 'UAH',
      paymentMethod: 'CARD',
      provider: 'manual',
      createdAt: new Date(),
      confirmedAt: new Date(),
    } as any);
    accountRepository.updateBalance = async (id, delta) => {
      expect(id).toBe('real-1');
      expect(delta).toBe(-200);
      return { ...realAccount, balance: 300 } as any;
    };

    const result = await withdrawService.withdraw({
      userId: 'user-1',
      amount: 200,
      paymentMethod: 'CARD',
    });

    expect(result.amount).toBe(200);
  });
});
