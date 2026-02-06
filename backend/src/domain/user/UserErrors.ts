/**
 * Domain errors for User
 * All extend AppError for consistent error handling
 */

import { AppError } from '../../shared/errors/AppError.js';

export class NicknameAlreadyTakenError extends AppError {
  constructor(nickname: string) {
    super(409, `Nickname ${nickname} is already taken`, 'NICKNAME_ALREADY_TAKEN');
    this.name = 'NicknameAlreadyTakenError';
  }
}

export class PhoneAlreadyTakenError extends AppError {
  constructor(phone: string) {
    super(409, `Phone ${phone} is already taken`, 'PHONE_ALREADY_TAKEN');
    this.name = 'PhoneAlreadyTakenError';
  }
}

export class UserNotFoundError extends AppError {
  constructor(userId: string) {
    super(404, `User ${userId} not found`, 'USER_NOT_FOUND');
    this.name = 'UserNotFoundError';
  }
}

export class InvalidPasswordError extends AppError {
  constructor(message: string = 'Invalid password') {
    super(400, message, 'INVALID_PASSWORD');
    this.name = 'InvalidPasswordError';
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(404, `Session ${sessionId} not found`, 'SESSION_NOT_FOUND');
    this.name = 'SessionNotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}
