import { Response, NextFunction } from 'express';
import { candidateService } from '../services/candidate.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { formatApiResponse } from '../utils/helpers';
import path from 'path';

import { uploadToCloudinary } from '../utils/cloudinary';

export const candidateController = {
  async getMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await candidateService.getProfile(req.user!.userId);
      res.json(formatApiResponse(profile, 'Profile fetched'));
    } catch (error) { next(error); }
  },

  async updateMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await candidateService.updateProfile(req.user!.userId, req.body);
      res.json(formatApiResponse(profile, 'Profile updated'));
    } catch (error) { next(error); }
  },

  async uploadResume(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const cloudUrl = await uploadToCloudinary(req.file.path, 'resumes');
      const resumeUrl = cloudUrl || `/uploads/resumes/${req.file.filename}`;
      const profile = await candidateService.uploadResume(req.user!.userId, resumeUrl, req.file.originalname);
      res.json(formatApiResponse({ resumeUrl, resumeName: req.file.originalname }, 'Resume uploaded'));
    } catch (error) { next(error); }
  },

  async listCandidates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await candidateService.listCandidates(req.user!.companyId!, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });
      res.json(formatApiResponse(result, 'Candidates fetched'));
    } catch (error) { next(error); }
  },

  async getCandidateById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const candidate = await candidateService.getCandidateById(req.params.id as string, req.user!.companyId!);
      res.json(formatApiResponse(candidate, 'Candidate fetched'));
    } catch (error) { next(error); }
  },
};
