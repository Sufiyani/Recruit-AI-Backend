import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { config } from '../config/config';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getExpiryDate,
} from '../utils/jwt';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../utils/errors';
import { generateUniqueCompanySlug } from '../utils/helpers';
import { UserRole } from '@prisma/client';

export class AuthService {
  async registerCompany(data: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    industry?: string;
    website?: string;
  }) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new ConflictError('Email already registered');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const companySlug = await generateUniqueCompanySlug(data.companyName);

    // Use transaction to create company + admin user atomically
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          slug: companySlug,
          industry: data.industry,
          website: data.website,
        },
      });

      const user = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: hashedPassword,
          role: UserRole.COMPANY_ADMIN,
          companyId: company.id,
        },
      });

      return { user, company };
    });

    const tokens = await this._generateTokenPair(result.user.id, result.user.email, result.user.role, result.company.id);
    return { user: this._sanitizeUser(result.user), company: result.company, ...tokens };
  }

  async registerCandidate(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new ConflictError('Email already registered');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: hashedPassword,
          role: UserRole.CANDIDATE,
        },
      });

      await tx.candidateProfile.create({ data: { userId: user.id } });
      return user;
    });

    const tokens = await this._generateTokenPair(result.id, result.email, result.role);
    return { user: this._sanitizeUser(result), ...tokens };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: { select: { id: true, name: true, slug: true } } },
    });

    if (!user || !user.isActive) throw new UnauthorizedError('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedError('Invalid email or password');

    const tokens = await this._generateTokenPair(user.id, user.email, user.role, user.companyId ?? undefined);
    return { user: this._sanitizeUser(user), company: user.company, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token is invalid or expired');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw new UnauthorizedError('User not found');

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    const tokens = await this._generateTokenPair(user.id, user.email, user.role, user.companyId ?? undefined);
    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: { select: { id: true, name: true, slug: true, logoUrl: true } },
        candidateProfile: { select: { id: true, headline: true, resumeUrl: true } },
      },
    });
    if (!user) throw new NotFoundError('User');
    return this._sanitizeUser(user);
  }

  private async _generateTokenPair(
    userId: string,
    email: string,
    role: UserRole,
    companyId?: string
  ) {
    const tokenId = uuidv4();
    const accessToken = generateAccessToken({ userId, email, role, companyId });
    const refreshToken = generateRefreshToken({ userId, tokenId });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: getExpiryDate(config.jwt.refreshExpiresIn),
      },
    });

    return { accessToken, refreshToken };
  }

  private _sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

export const authService = new AuthService();
