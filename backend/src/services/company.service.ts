import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class CompanyService {
  async getCompany(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { _count: { select: { jobs: true, users: true } } },
    });
    if (!company) throw new NotFoundError('Company');
    return company;
  }

  async updateCompany(companyId: string, requestingCompanyId: string, data: {
    name?: string; website?: string; industry?: string;
    size?: string; description?: string; address?: string; country?: string;
  }) {
    if (companyId !== requestingCompanyId) throw new ForbiddenError('Access denied');
    return prisma.company.update({ where: { id: companyId }, data });
  }

  async updateLogo(companyId: string, logoUrl: string) {
    return prisma.company.update({ where: { id: companyId }, data: { logoUrl } });
  }

  async getSettings(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    if (!company) throw new NotFoundError('Company');
    return company.settings;
  }

  async updateSettings(companyId: string, settings: Record<string, unknown>) {
    return prisma.company.update({
      where: { id: companyId },
      data: { settings },
      select: { settings: true },
    });
  }

  async listAllCompanies(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        skip, take: limit,
        include: { _count: { select: { jobs: true, users: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.company.count(),
    ]);
    return { data: companies, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}

export const companyService = new CompanyService();
