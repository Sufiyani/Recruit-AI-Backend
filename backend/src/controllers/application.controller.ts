import { Response, NextFunction } from 'express';
import { applicationService } from '../services/application.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { formatApiResponse } from '../utils/helpers';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';

import { uploadToCloudinary } from '../utils/cloudinary';
import { aiService } from '../services/ai.service';

export const applicationController = {
  async apply(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user!.userId } });
      if (!profile) throw new NotFoundError('Candidate profile');

      let resumeUrl = req.body.resumeUrl;
      let resumeName = req.body.resumeName;

      if (req.file) {
        resumeName = req.file.originalname;
        const cloudUrl = await uploadToCloudinary(req.file.path, 'resumes');
        resumeUrl = cloudUrl || `/uploads/resumes/${req.file.filename}`;
      }

      const application = await applicationService.apply(
        {
          ...req.body,
          resumeUrl,
          resumeName,
        },
        profile.id
      );
      res.status(201).json(formatApiResponse(application, 'Application submitted', 201));
    } catch (error) { next(error); }
  },

  async scoreCV(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiService.scoreApplicationCV(req.params.id as string);
      res.json(formatApiResponse(result, 'AI CV scoring complete'));
    } catch (error) { next(error); }
  },

  async getMyApplications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user!.userId } });
      if (!profile) throw new NotFoundError('Candidate profile');
      const result = await applicationService.getCandidateApplications(profile.id, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      res.json(formatApiResponse(result, 'Applications fetched'));
    } catch (error) { next(error); }
  },

  async getJobApplications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await applicationService.getJobApplications(req.params.jobId as string, req.user!.companyId!, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        status: req.query.status ? String(req.query.status) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      });
      res.json(formatApiResponse(result, 'Applications fetched'));
    } catch (error) { next(error); }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const application = await applicationService.getApplicationById(req.params.id as string);
      res.json(formatApiResponse(application, 'Application fetched'));
    } catch (error) { next(error); }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const application = await applicationService.updateStatus(req.params.id as string, req.body, req.user!.companyId!);
      res.json(formatApiResponse(application, 'Application status updated'));
    } catch (error) { next(error); }
  },
};
