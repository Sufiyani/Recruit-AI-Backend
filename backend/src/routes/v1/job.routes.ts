import { Router } from 'express';
import { jobController } from '../../controllers/job.controller';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, requireCompany } from '../../middlewares/auth';
import { createJobSchema, updateJobSchema } from '../../validators/job.validator';

const router = Router();

// Public routes
router.get('/', jobController.listPublic);
router.get('/:id', jobController.getById);

// HR routes
router.get('/company/my', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, jobController.listCompanyJobs as any);
router.post('/', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, validate(createJobSchema), jobController.create as any);
router.put('/:id', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, validate(updateJobSchema), jobController.update as any);
router.delete('/:id', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, jobController.delete as any);
router.patch('/:id/publish', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, jobController.togglePublish as any);

export default router;
