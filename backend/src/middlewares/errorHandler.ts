import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`${req.method} ${req.path} - ${err.message}`, {
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Validation errors
  if (err instanceof ValidationError) {
    res.status(422).json({
      success: false,
      statusCode: 422,
      message: err.message,
      errors: err.errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Operational errors (our custom AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'A record with this value already exists',
        code: 'CONFLICT',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Record not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Token has expired',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unknown errors
  const statusCode = process.env.NODE_ENV === 'production' ? 500 : 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
}
