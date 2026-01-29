/**
 * Domain errors for Accounts
 */

export class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountError';
  }
}

export class AccountNotFoundError extends AccountError {
  constructor(accountId?: string) {
    super(accountId ? `Account with id ${accountId} not found` : 'Account not found');
    this.name = 'AccountNotFoundError';
  }
}

export class AccountAlreadyExistsError extends AccountError {
  constructor(userId: string, type: string) {
    super(`Account of type ${type} already exists for user ${userId}`);
    this.name = 'AccountAlreadyExistsError';
  }
}

export class InvalidAccountTypeError extends AccountError {
  constructor(type: string) {
    super(`Invalid account type: ${type}`);
    this.name = 'InvalidAccountTypeError';
  }
}

export class InsufficientBalanceError extends AccountError {
  constructor() {
    super('Insufficient balance');
    this.name = 'InsufficientBalanceError';
  }
}

export class UnauthorizedAccountAccessError extends AccountError {
  constructor() {
    super('Unauthorized access to account');
    this.name = 'UnauthorizedAccountAccessError';
  }
}
