import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { generateUniqueJobSlug } from '../utils/helpers';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { CreateJobInput, UpdateJobInput } from '../validators/job.validator';
import { JobStatus, JobType, Prisma } from '@prisma/client';

export class JobService {
  async createJob(data: CreateJobInput, companyId: string, userId?: string) {
    const slug = await generateUniqueJobSlug(data.title, companyId);
    const job = await prisma.job.create({
      data: {
        ...data,
        slug,
        companyId,
        createdById: userId || companyId,
        type: (data.type as JobType) || JobType.FULL_TIME,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
      include: { company: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    return job;
  }

  async updateJob(jobId: string, data: UpdateJobInput, companyId: string) {
    const job = await this._findJobOrFail(jobId);
    if (job.companyId !== companyId) throw new ForbiddenError('You can only edit your own jobs');

    return prisma.job.update({
      where: { id: jobId },
      data: {
        ...data,
        type: data.type as JobType | undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
      include: { company: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
  }

  async deleteJob(jobId: string, companyId: string) {
    const job = await this._findJobOrFail(jobId);
    if (job.companyId !== companyId) throw new ForbiddenError('You can only delete your own jobs');
    await prisma.job.delete({ where: { id: jobId } });
  }

  async togglePublish(jobId: string, companyId: string) {
    const job = await this._findJobOrFail(jobId);
    if (job.companyId !== companyId) throw new ForbiddenError('Access denied');
    const newStatus = job.status === JobStatus.PUBLISHED ? JobStatus.DRAFT : JobStatus.PUBLISHED;
    return prisma.job.update({ where: { id: jobId }, data: { status: newStatus } });
  }

  async getJobById(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: { select: { id: true, name: true, slug: true, logoUrl: true, website: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundError('Job');
    return job;
  }

  async listPublicJobs(query: {
    page?: number; limit?: number; search?: string;
    type?: string; location?: string; sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, orderBy } = getPaginationParams(query);
    const where: Prisma.JobWhereInput = {
      status: JobStatus.PUBLISHED,
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.type && { type: query.type as JobType }),
      ...(query.location && { location: { contains: query.location, mode: 'insensitive' } }),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where, skip, take, orderBy,
        include: {
          company: { select: { id: true, name: true, slug: true, logoUrl: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return buildPaginatedResult(jobs, total, query.page || 1, take);
  }

  async listCompanyJobs(companyId: string, query: {
    page?: number; limit?: number; search?: string;
    status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, orderBy } = getPaginationParams(query);
    const where: Prisma.JobWhereInput = {
      companyId,
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.status && { status: query.status as JobStatus }),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where, skip, take, orderBy,
        include: { _count: { select: { applications: true } } },
      }),
      prisma.job.count({ where }),
    ]);

    return buildPaginatedResult(jobs, total, query.page || 1, take);
  }

  private async _findJobOrFail(jobId: string) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job');
    return job;
  }
}

export const jobService = new JobService();
