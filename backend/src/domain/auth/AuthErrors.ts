/**
 * Domain errors for Auth
 */

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class UserNotFoundError extends AuthError {
  constructor(email?: string) {
    super(email ? `User with email ${email} not found` : 'User not found');
    this.name = 'UserNotFoundError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserAlreadyExistsError extends AuthError {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class SessionNotFoundError extends AuthError {
  constructor() {
    super('Session not found or expired');
    this.name = 'SessionNotFoundError';
  }
}

export class InvalidSessionError extends AuthError {
  constructor() {
    super('Invalid or expired session');
    this.name = 'InvalidSessionError';
  }
}
