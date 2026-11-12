import { Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { companyService } from '../services/company.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { formatApiResponse } from '../utils/helpers';

export const dashboardController = {
  async hrDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getHRDashboard(req.user!.companyId!);
      res.json(formatApiResponse(data, 'HR dashboard data fetched'));
    } catch (error) { next(error); }
  },

  async candidateDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { prisma } = await import('../config/database');
      const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user!.userId } });
      if (!profile) {
        res.status(404).json({ success: false, message: 'Profile not found' });
        return;
      }
      const data = await dashboardService.getCandidateDashboard(profile.id);
      res.json(formatApiResponse(data, 'Candidate dashboard data fetched'));
    } catch (error) { next(error); }
  },

  async adminDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getAdminDashboard();
      res.json(formatApiResponse(data, 'Admin dashboard data fetched'));
    } catch (error) { next(error); }
  },
};

export const companyController = {
  async getCompany(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const company = await companyService.getCompany((req.params.id as string) || req.user!.companyId!);
      res.json(formatApiResponse(company, 'Company fetched'));
    } catch (error) { next(error); }
  },

  async updateCompany(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const company = await companyService.updateCompany(req.params.id as string, req.user!.companyId!, req.body);
      res.json(formatApiResponse(company, 'Company updated'));
    } catch (error) { next(error); }
  },

  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await companyService.getSettings(req.user!.companyId!);
      res.json(formatApiResponse(settings, 'Settings fetched'));
    } catch (error) { next(error); }
  },

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await companyService.updateSettings(req.user!.companyId!, req.body);
      res.json(formatApiResponse(settings, 'Settings updated'));
    } catch (error) { next(error); }
  },

  async listCompanies(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await companyService.listAllCompanies(Number(req.query.page) || 1, Number(req.query.limit) || 20);
      res.json(formatApiResponse(result, 'Companies fetched'));
    } catch (error) { next(error); }
  },
};
