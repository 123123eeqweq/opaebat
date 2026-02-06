/**
 * Domain tests: AccountService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AccountService } from '../../src/domain/accounts/AccountService.js';
import { AccountType } from '../../src/domain/accounts/AccountTypes.js';
import {
  AccountNotFoundError,
  AccountAlreadyExistsError,
  InvalidAccountTypeError,
  UnauthorizedAccountAccessError,
  DemoResetNotAllowedError,
  DemoAccountNotFoundError,
} from '../../src/domain/accounts/AccountErrors.js';
import { mockAccountRepository } from '../helpers/mocks.js';
import { mockTransactionRepository } from '../helpers/mocks.js';
import { createTestAccount } from '../helpers/factories.js';

describe('AccountService', () => {
  let accountService: AccountService;
  let accountRepository: ReturnType<typeof mockAccountRepository>;
  let transactionRepository: ReturnType<typeof mockTransactionRepository>;

  beforeEach(() => {
    accountRepository = mockAccountRepository();
    transactionRepository = mockTransactionRepository();
    accountService = new AccountService(accountRepository, transactionRepository);
  });

  describe('createAccount', () => {
    it('should create demo account with 10000 balance', async () => {
      let createData: any = null;
      accountRepository.findByUserIdAndType = async () => null;
      accountRepository.findByUserId = async () => [];
      accountRepository.create = async (data) => {
        createData = data;
        return { ...data, id: 'acc-1', createdAt: new Date() } as any;
      };

      const result = await accountService.createAccount({
        userId: 'user-1',
        type: AccountType.DEMO,
      });

      expect(result.type).toBe('demo');
      expect(result.balance).toBe('10000');
      expect(createData).toMatchObject({
        userId: 'user-1',
        type: AccountType.DEMO,
        balance: 10_000,
        currency: 'USD',
      });
    });

    it('should create real account with 0 balance', async () => {
      let createData: any = null;
      accountRepository.findByUserIdAndType = async () => null;
      accountRepository.findByUserId = async () => [];
      accountRepository.create = async (data) => {
        createData = data;
        return { ...data, id: 'acc-2', createdAt: new Date() } as any;
      };

      const result = await accountService.createAccount({
        userId: 'user-1',
        type: AccountType.REAL,
      });

      expect(result.type).toBe('real');
      expect(result.balance).toBe('0');
      expect(createData).toMatchObject({
        balance: 0,
        currency: 'UAH',
      });
    });

    it('should throw AccountAlreadyExistsError when demo exists', async () => {
      accountRepository.findByUserIdAndType = async (_, type) =>
        type === AccountType.DEMO ? createTestAccount({ type: AccountType.DEMO }) : null;

      await expect(
        accountService.createAccount({ userId: 'user-1', type: AccountType.DEMO })
      ).rejects.toThrow(AccountAlreadyExistsError);
    });

    it('should throw InvalidAccountTypeError for invalid type', async () => {
      await expect(
        accountService.createAccount({ userId: 'user-1', type: 'invalid' as any })
      ).rejects.toThrow(InvalidAccountTypeError);
    });
  });

  describe('setActiveAccount', () => {
    it('should throw AccountNotFoundError when account does not exist', async () => {
      accountRepository.findById = async () => null;

      await expect(
        accountService.setActiveAccount('user-1', 'nonexistent')
      ).rejects.toThrow(AccountNotFoundError);
    });

    it('should throw UnauthorizedAccountAccessError when account belongs to different user', async () => {
      const account = createTestAccount({ userId: 'other-user', isActive: false });
      accountRepository.findById = async () => account;

      await expect(
        accountService.setActiveAccount('user-1', account.id)
      ).rejects.toThrow(UnauthorizedAccountAccessError);
    });
  });

  describe('resetDemoAccount', () => {
    it('should throw DemoAccountNotFoundError when no demo account', async () => {
      accountRepository.findDemoByUserId = async () => null;

      await expect(accountService.resetDemoAccount('user-1')).rejects.toThrow(DemoAccountNotFoundError);
    });

    it('should throw DemoResetNotAllowedError when balance >= 1000', async () => {
      const demoAccount = createTestAccount({
        type: AccountType.DEMO,
        balance: 5000,
      });
      accountRepository.findDemoByUserId = async () => demoAccount;

      await expect(accountService.resetDemoAccount('user-1')).rejects.toThrow(DemoResetNotAllowedError);
    });

    it('should reset balance to 10000 when balance < 1000', async () => {
      const demoAccount = createTestAccount({
        id: 'demo-1',
        type: AccountType.DEMO,
        balance: 500,
      });
      let setBalanceCalled: { id: string; balance: number } | null = null;
      accountRepository.findDemoByUserId = async () => demoAccount;
      accountRepository.setBalance = async (id, balance) => {
        setBalanceCalled = { id, balance };
        return { ...demoAccount, balance } as any;
      };

      const result = await accountService.resetDemoAccount('user-1');

      expect(result.balance).toBe('10000');
      expect(setBalanceCalled).toEqual({ id: 'demo-1', balance: 10000 });
    });
  });
});
