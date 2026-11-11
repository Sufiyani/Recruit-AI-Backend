import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role: UserRole;
    companyId?: string;
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
      companyId: payload.companyId,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
}

export function requireCompany(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user?.companyId) {
    return next(new ForbiddenError('This action requires a company association'));
  }
  next();
}

// Verify user still exists and is active
export async function verifyActiveUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) return next(new UnauthorizedError());
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isActive: true },
    });
    if (!user || !user.isActive) {
      return next(new UnauthorizedError('Your account has been deactivated'));
    }
    next();
  } catch (error) {
    next(error);
  }
}
