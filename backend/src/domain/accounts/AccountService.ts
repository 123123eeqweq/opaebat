/**
 * Account domain service - pure business logic
 */

import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { Account, CreateAccountInput, AccountDTO } from './AccountTypes.js';
import { AccountType } from './AccountTypes.js';
import {
  AccountNotFoundError,
  AccountAlreadyExistsError,
  InvalidAccountTypeError,
  UnauthorizedAccountAccessError,
} from './AccountErrors.js';

export class AccountService {
  constructor(private accountRepository: AccountRepository) {}

  /**
   * Get all accounts for user
   */
  async getAccounts(userId: string): Promise<AccountDTO[]> {
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map(this.toDTO);
  }

  /**
   * Get active account for user
   */
  async getActiveAccount(userId: string): Promise<AccountDTO | null> {
    const account = await this.accountRepository.findActiveByUserId(userId);
    return account ? this.toDTO(account) : null;
  }

  /**
   * Create account for user
   * Rules:
   * - User can have only 1 demo and 1 real account
   * - If account type already exists, throw error
   */
  async createAccount(input: CreateAccountInput): Promise<AccountDTO> {
    // Validate account type
    if (input.type !== AccountType.DEMO && input.type !== AccountType.REAL) {
      throw new InvalidAccountTypeError(input.type);
    }

    // Check if account of this type already exists
    const existing = await this.accountRepository.findByUserIdAndType(input.userId, input.type);
    if (existing) {
      throw new AccountAlreadyExistsError(input.userId, input.type);
    }

    // If this is the first account, make it active
    const allAccounts = await this.accountRepository.findByUserId(input.userId);
    const isFirstAccount = allAccounts.length === 0;

    // Стартовый баланс:
    // - demo: 10 000 (игровые деньги)
    // - real: 0 (пополняется отдельно)
    const initialBalance = input.type === AccountType.DEMO ? 10_000 : 0;

    // Create account
    const account = await this.accountRepository.create({
      userId: input.userId,
      type: input.type,
      balance: initialBalance,
      currency: 'USD',
      isActive: isFirstAccount,
    });

    return this.toDTO(account);
  }

  /**
   * Set active account for user
   * Rules:
   * - Only one account can be active at a time
   * - Account must belong to user
   */
  async setActiveAccount(userId: string, accountId: string): Promise<AccountDTO> {
    // Find account
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    // Verify ownership
    if (account.userId !== userId) {
      throw new UnauthorizedAccountAccessError();
    }

    // Set as active (this will deactivate others)
    await this.accountRepository.setActive(userId, accountId);

    // Get updated account
    const updatedAccount = await this.accountRepository.findById(accountId);
    if (!updatedAccount) {
      throw new AccountNotFoundError(accountId);
    }

    return this.toDTO(updatedAccount);
  }

  /**
   * Adjust balance (internal method, for future flows)
   * Rules:
   * - Atomic operation
   * - Balance cannot go negative
   */
  async adjustBalance(accountId: string, delta: number): Promise<Account> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    // Check if balance would go negative
    const newBalance = Number(account.balance) + delta;
    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }

    // Update balance atomically
    return this.accountRepository.updateBalance(accountId, delta);
  }

  /**
   * Convert Account to DTO
   */
  private toDTO(account: Account): AccountDTO {
    return {
      id: account.id,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      isActive: account.isActive,
    };
  }
}
