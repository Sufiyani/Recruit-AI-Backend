import { Request, Response, NextFunction } from 'express';
import { jobService } from '../services/job.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { formatApiResponse } from '../utils/helpers';

export const jobController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const job = await jobService.createJob(req.body, req.user!.companyId!, req.user!.id);
      res.status(201).json(formatApiResponse(job, 'Job created', 201));
    } catch (error) { next(error); }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const job = await jobService.updateJob(req.params.id, req.body, req.user!.companyId!);
      res.json(formatApiResponse(job, 'Job updated'));
    } catch (error) { next(error); }
  },

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await jobService.deleteJob(req.params.id, req.user!.companyId!);
      res.json(formatApiResponse(null, 'Job deleted'));
    } catch (error) { next(error); }
  },

  async togglePublish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const job = await jobService.togglePublish(req.params.id, req.user!.companyId!);
      res.json(formatApiResponse(job, 'Job status updated'));
    } catch (error) { next(error); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await jobService.getJobById(req.params.id);
      res.json(formatApiResponse(job, 'Job fetched'));
    } catch (error) { next(error); }
  },

  async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await jobService.listPublicJobs({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search as string,
        type: req.query.type as string,
        location: req.query.location as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });
      res.json(formatApiResponse(result, 'Jobs fetched'));
    } catch (error) { next(error); }
  },

  async listCompanyJobs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await jobService.listCompanyJobs(req.user!.companyId!, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search as string,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });
      res.json(formatApiResponse(result, 'Company jobs fetched'));
    } catch (error) { next(error); }
  },
};
