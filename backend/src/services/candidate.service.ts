import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { Prisma } from '@prisma/client';

export class CandidateService {
  async getProfile(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } } },
    });
    if (!profile) throw new NotFoundError('Candidate profile');
    return profile;
  }

  async updateProfile(userId: string, data: {
    headline?: string;
    bio?: string;
    skills?: string[];
    experience?: any;
    education?: any;
    portfolioUrl?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    location?: string;
  }) {
    return prisma.candidateProfile.update({
      where: { userId },
      data,
    });
  }

  async uploadResume(userId: string, resumeUrl: string, resumeName: string) {
    return prisma.candidateProfile.update({
      where: { userId },
      data: { resumeUrl, resumeName },
    });
  }

  async listCandidates(companyId: string, query: {
    page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, orderBy } = getPaginationParams(query);

    // HR can only see candidates who applied to their jobs
    const where: Prisma.CandidateProfileWhereInput = {
      applications: { some: { job: { companyId } } },
      ...(query.search && {
        OR: [
          { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
          { user: { email: { contains: query.search, mode: 'insensitive' } } },
          { headline: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [candidates, total] = await Promise.all([
      prisma.candidateProfile.findMany({
        where, skip, take,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.candidateProfile.count({ where }),
    ]);

    return buildPaginatedResult(candidates, total, query.page || 1, take);
  }

  async getCandidateById(candidateId: string, companyId: string) {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        applications: {
          where: { job: { companyId } },
          include: { job: { select: { id: true, title: true } } },
        },
      },
    });
    if (!candidate) throw new NotFoundError('Candidate');
    return candidate;
  }
}

export const candidateService = new CandidateService();
