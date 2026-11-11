import { Router } from 'express';
import { interviewController } from '../../controllers/interview.controller';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, requireCompany } from '../../middlewares/auth';
import { scheduleInterviewSchema, updateInterviewSchema, updateInterviewStatusSchema } from '../../validators/interview.validator';

const router = Router();

router.post('/', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, validate(scheduleInterviewSchema), interviewController.schedule as any);
router.get('/', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, interviewController.getCompanyInterviews as any);
router.get('/admin/all', authenticate as any, authorize('SUPER_ADMIN'), interviewController.getAdminInterviews as any);
router.get('/my', authenticate as any, authorize('CANDIDATE'), interviewController.getCandidateInterviews as any);
router.get('/application/:appId', authenticate as any, interviewController.getByApplication as any);
router.get('/tts/stream', interviewController.streamTTS as any);
router.get('/:id', authenticate as any, interviewController.getById as any);
router.put('/:id', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, validate(updateInterviewSchema), interviewController.update as any);
router.patch('/:id/status', authenticate as any, authorize('COMPANY_ADMIN', 'SUPER_ADMIN'), validate(updateInterviewStatusSchema), interviewController.updateStatus as any);

// AI Voice Interview Endpoints
router.post('/:id/ai/start', authenticate as any, interviewController.startAiInterview as any);
router.post('/:id/ai/answer', authenticate as any, interviewController.submitAiAnswer as any);
router.post('/:id/ai/complete', authenticate as any, interviewController.completeAiInterview as any);

export default router;
