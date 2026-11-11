import { prisma } from '../config/database';

export class DashboardService {
  async getHRDashboard(companyId: string) {
    const [totalJobs, publishedJobs, totalApplications, totalCandidates,
      scheduledInterviews, recentApplications, applicationsByStatus] = await Promise.all([
      prisma.job.count({ where: { companyId } }),
      prisma.job.count({ where: { companyId, status: 'PUBLISHED' } }),
      prisma.application.count({ where: { job: { companyId } } }),
      prisma.candidateProfile.count({ where: { applications: { some: { job: { companyId } } } } }),
      prisma.interview.count({ where: { application: { job: { companyId } }, status: 'SCHEDULED' } }),
      prisma.application.findMany({
        where: { job: { companyId } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          job: { select: { title: true } },
          candidate: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.application.groupBy({
        by: ['status'],
        where: { job: { companyId } },
        _count: { status: true },
      }),
    ]);

    const hiringFunnel = applicationsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      stats: { totalJobs, publishedJobs, totalApplications, totalCandidates, scheduledInterviews },
      hiringFunnel,
      recentApplications,
    };
  }

  async getCandidateDashboard(candidateProfileId: string) {
    const [totalApplications, applicationsByStatus, upcomingInterviews, interviewHistory] = await Promise.all([
      prisma.application.count({ where: { candidateId: candidateProfileId } }),
      prisma.application.groupBy({
        by: ['status'],
        where: { candidateId: candidateProfileId },
        _count: { status: true },
      }),
      prisma.interview.findMany({
        where: {
          application: { candidateId: candidateProfileId },
          status: 'SCHEDULED',
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: {
          application: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  company: { select: { id: true, name: true, logoUrl: true } },
                },
              },
            },
          },
        },
      }),
      // Complete interview history with full company and application details
      prisma.interview.findMany({
        where: { application: { candidateId: candidateProfileId } },
        orderBy: { scheduledAt: 'desc' },
        include: {
          application: {
            include: {
              job: {
                include: {
                  company: { select: { id: true, name: true, logoUrl: true, industry: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const statusSummary = applicationsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return { stats: { totalApplications }, statusSummary, upcomingInterviews, interviewHistory };
  }

  async getAdminDashboard() {
    const [
      totalCompanies,
      totalUsers,
      totalJobs,
      totalApplications,
      totalInterviews,
      completedInterviews,
      scheduledInterviews,
      shortlistedCandidates,
      recentInterviews,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.interview.count(),
      prisma.interview.count({ where: { status: 'COMPLETED' } }),
      prisma.interview.count({ where: { status: 'SCHEDULED' } }),
      prisma.application.count({ where: { status: 'SHORTLISTED' } }),
      prisma.interview.findMany({
        orderBy: { scheduledAt: 'desc' },
        take: 8,
        include: {
          application: {
            include: {
              job: {
                include: {
                  company: { select: { id: true, name: true, logoUrl: true } },
                },
              },
              candidate: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      stats: {
        totalCompanies,
        totalUsers,
        totalJobs,
        totalApplications,
        totalInterviews,
        completedInterviews,
        scheduledInterviews,
        shortlistedCandidates,
      },
      recentInterviews,
    };
  }
}

export const dashboardService = new DashboardService();
