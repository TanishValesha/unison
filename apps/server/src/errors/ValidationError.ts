import { AppError } from './AppError.js';

export interface ValidationDetail {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly details: ValidationDetail[];

  constructor(details: ValidationDetail[]) {
    super('Validation failed', 422, 'VALIDATION_ERROR');
    this.details = details;
  }
}