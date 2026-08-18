import { AppError } from './AppError.js';

export class ConflictError extends AppError {
  constructor(field: string) {
    super(`Resource already exists with this ${field}`, 409, 'CONFLICT');
  }
}