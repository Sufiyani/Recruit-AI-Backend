import { Router } from 'express';
import { applicationController } from '../../controllers/application.controller';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, requireCompany } from '../../middlewares/auth';
import { createApplicationSchema, updateApplicationStatusSchema } from '../../validators/application.validator';

import { resumeUpload } from '../../middlewares/upload';

const router = Router();

// Candidate routes
router.post('/', authenticate as any, authorize('CANDIDATE'), resumeUpload.single('resume'), validate(createApplicationSchema), applicationController.apply as any);
router.get('/my', authenticate as any, authorize('CANDIDATE'), applicationController.getMyApplications as any);

// HR routes
router.get('/job/:jobId', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, applicationController.getJobApplications as any);
router.patch('/:id/status', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, validate(updateApplicationStatusSchema), applicationController.updateStatus as any);
router.post('/:id/ai-score', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, applicationController.scoreCV as any);

// Shared
router.get('/:id', authenticate as any, applicationController.getById as any);

export default router;
