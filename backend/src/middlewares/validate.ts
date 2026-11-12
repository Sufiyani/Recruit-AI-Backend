import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, z } from 'zod';
import { ValidationError } from '../utils/errors';

type ParsedSchema = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

export function validate(schema: ZodSchema<ParsedSchema>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        const issues = (result.error as any)?.issues || (result.error as any)?.errors || [];
        issues.forEach((err: any) => {
          const path = Array.isArray(err.path) && err.path.length > 1
            ? err.path.slice(1).join('.')
            : Array.isArray(err.path) && err.path.length === 1
            ? String(err.path[0])
            : 'root';
          if (!errors[path]) errors[path] = [];
          errors[path].push(err.message);
        });

        const firstMsg = issues[0]?.message ? `: ${issues[0].message}` : '';
        const validationError = new ValidationError(errors);
        (validationError as any).message = `Validation failed${firstMsg}`;
        return next(validationError);
      }

      req.body = result.data.body;
      next();
    } catch (error) {
      next(error);
    }
  };
}
