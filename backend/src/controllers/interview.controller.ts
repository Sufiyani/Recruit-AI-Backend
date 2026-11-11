import { Response, NextFunction } from 'express';
import { interviewService } from '../services/interview.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { formatApiResponse } from '../utils/helpers';
import { InterviewStatus } from '@prisma/client';

export const interviewController = {
  async schedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const interview = await interviewService.schedule(req.body, req.user!.companyId!);
      res.status(201).json(formatApiResponse(interview, 'Interview scheduled', 201));
    } catch (error) { next(error); }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const interview = await interviewService.update(req.params.id as string, req.body, req.user!.companyId!);
      res.json(formatApiResponse(interview, 'Interview updated'));
    } catch (error) { next(error); }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const interview = await interviewService.updateStatus(
        req.params.id as string,
        req.body,
        req.user?.role === 'SUPER_ADMIN' ? undefined : req.user!.companyId!
      );
      res.json(formatApiResponse(interview, 'Interview and application status updated'));
    } catch (error) { next(error); }
  },

  async getAdminInterviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await interviewService.getAllInterviews({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        companyId: req.query.companyId ? String(req.query.companyId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      });
      res.json(formatApiResponse(result, 'Admin interviews fetched'));
    } catch (error) { next(error); }
  },

  async getByApplication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const interviews = await interviewService.getByApplication(req.params.appId as string);
      res.json(formatApiResponse(interviews, 'Interviews fetched'));
    } catch (error) { next(error); }
  },

  async getCandidateInterviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await interviewService.getCandidateInterviews(req.user!.id, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        status: req.query.status as string,
      });
      res.json(formatApiResponse(result, 'Candidate interviews fetched'));
    } catch (error) { next(error); }
  },

  async getCompanyInterviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await interviewService.getCompanyInterviews(req.user!.companyId!, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        status: req.query.status as string,
      });
      res.json(formatApiResponse(result, 'Interviews fetched'));
    } catch (error) { next(error); }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const interview = await interviewService.getById(req.params.id as string, {
        id: req.user!.id,
        role: req.user!.role,
        companyId: req.user!.companyId,
      });
      res.json(formatApiResponse(interview, 'Interview details fetched'));
    } catch (error) { next(error); }
  },

  async startAiInterview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await interviewService.startAiInterview(req.params.id as string, req.user!.id);
      res.json(formatApiResponse(result, 'AI Voice interview initiated'));
    } catch (error) { next(error); }
  },

  async submitAiAnswer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { questionIndex, answerText, snapshot, proctoringMetrics } = req.body;
      const result = await interviewService.submitAiAnswer(req.params.id as string, req.user!.id, {
        questionIndex: Number(questionIndex),
        answerText: String(answerText || ''),
        snapshot: snapshot ? String(snapshot) : undefined,
        proctoringMetrics: proctoringMetrics || undefined,
      });
      res.json(formatApiResponse(result, 'Answer evaluated'));
    } catch (error) { next(error); }
  },

  async completeAiInterview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { proctoringSummary } = req.body;
      const result = await interviewService.completeAiInterview(
        req.params.id as string,
        req.user!.id,
        proctoringSummary || undefined
      );
      res.json(formatApiResponse(result, 'AI Voice interview completed successfully'));
    } catch (error) { next(error); }
  },

  async streamTTS(req: any, res: Response, next: NextFunction) {
    try {
      const text = String(req.query.text || '').slice(0, 500);
      if (!text.trim()) {
        res.status(400).send('No text provided');
        return;
      }
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
      const audioRes = await fetch(url);
      if (!audioRes.ok) {
        res.status(audioRes.status).send('TTS fetch failed');
        return;
      }
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await audioRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      next(error);
    }
  },
};
