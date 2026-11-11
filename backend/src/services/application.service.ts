import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { CreateApplicationInput, UpdateApplicationStatusInput } from '../validators/application.validator';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { notificationService } from './notification.service';

export class ApplicationService {
  async apply(data: CreateApplicationInput & { resumeUrl?: string; resumeName?: string }, candidateProfileId: string) {
    // Check if job exists and is published
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.status !== 'PUBLISHED') throw new ForbiddenError('This job is no longer accepting applications');

    // Check duplicate application
    const existing = await prisma.application.findUnique({
      where: { jobId_candidateId: { jobId: data.jobId, candidateId: candidateProfileId } },
    });
    if (existing) throw new ConflictError('You have already applied for this job');

    // If application has no explicit resumeUrl, fallback to candidateProfile.resumeUrl if available
    let finalResumeUrl = data.resumeUrl;
    let finalResumeName = data.resumeName;
    if (!finalResumeUrl) {
      const candidate = await prisma.candidateProfile.findUnique({ where: { id: candidateProfileId } });
      if (candidate?.resumeUrl) {
        finalResumeUrl = candidate.resumeUrl;
        finalResumeName = candidate.resumeName || 'Profile Resume.pdf';
      }
    }

    const application = await prisma.application.create({
      data: {
        jobId: data.jobId,
        candidateId: candidateProfileId,
        coverLetter: data.coverLetter,
        resumeUrl: finalResumeUrl,
        resumeName: finalResumeName,
      },
      include: {
        job: { select: { title: true, company: { select: { name: true } } } },
        candidate: { select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });

    // Notify candidate
    await notificationService.create({
      userId: application.candidate.user.id,
      title: 'Application Submitted',
      message: `Your application for "${application.job.title}" at ${application.job.company.name} has been submitted.`,
      type: 'APPLICATION',
      link: `/candidate/applications/${application.id}`,
    });

    // Automatically trigger AI CV Scoring asynchronously
    try {
      const { aiService } = await import('./ai.service');
      await aiService.scoreApplicationCV(application.id);
    } catch {
      // Non-blocking if AI fails
    }

    return application;
  }

  async getCandidateApplications(candidateProfileId: string, query: {
    page?: number; limit?: number; status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, orderBy } = getPaginationParams(query);
    const where: Prisma.ApplicationWhereInput = {
      candidateId: candidateProfileId,
      ...(query.status && { status: query.status as ApplicationStatus }),
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where, skip, take, orderBy,
        include: {
          job: { include: { company: { select: { id: true, name: true, logoUrl: true } } } },
          interviews: { orderBy: { scheduledAt: 'asc' }, take: 1 },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return buildPaginatedResult(applications, total, query.page || 1, take);
  }

  async getJobApplications(jobId: string, companyId: string, query: {
    page?: number; limit?: number; status?: string; search?: string;
    sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.companyId !== companyId) throw new ForbiddenError('Access denied');

    const { skip, take, orderBy } = getPaginationParams(query);
    const where: Prisma.ApplicationWhereInput = {
      jobId,
      ...(query.status && { status: query.status as ApplicationStatus }),
      ...(query.search && {
        candidate: {
          user: {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      }),
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where, skip, take, orderBy,
        include: {
          candidate: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
          },
          interviews: { orderBy: { scheduledAt: 'desc' }, take: 1 },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return buildPaginatedResult(applications, total, query.page || 1, take);
  }

  async getApplicationById(applicationId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { company: { select: { id: true, name: true, logoUrl: true } } } },
        candidate: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } } },
        },
        interviews: { orderBy: { scheduledAt: 'asc' } },
      },
    });
    if (!application) throw new NotFoundError('Application');
    return application;
  }

  async updateStatus(applicationId: string, data: UpdateApplicationStatusInput, companyId: string) {
    const application = await this.getApplicationById(applicationId);
    if (application.job.company.id !== companyId) throw new ForbiddenError('Access denied');

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: data.status as ApplicationStatus, notes: data.notes },
    });

    // Notify candidate about status change
    const candidateUserId = application.candidate.user.id;
    await notificationService.create({
      userId: candidateUserId,
      title: 'Application Status Updated',
      message: `Your application for "${application.job.title}" status changed to ${data.status}.`,
      type: 'APPLICATION',
      link: `/candidate/applications/${applicationId}`,
    });

    return updated;
  }
}

export const applicationService = new ApplicationService();
