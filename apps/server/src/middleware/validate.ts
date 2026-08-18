import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: { field: string; message: string }[] = [];

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({ field: `params.${issue.path.join('.')}`, message: issue.message });
        }
      } else {
        req.params = result.data as Record<string, string>;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({ field: `query.${issue.path.join('.')}`, message: issue.message });
        }
      } else {
        req.query = result.data as Record<string, string>;
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({ field: `body.${issue.path.join('.')}`, message: issue.message });
        }
      } else {
        req.body = result.data;
      }
    }

    if (details.length > 0) {
      throw new ValidationError(details);
    }

    next();
  };
}