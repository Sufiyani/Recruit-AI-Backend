import { Router } from 'express';
import { candidateController } from '../../controllers/candidate.controller';
import { authenticate, authorize, requireCompany } from '../../middlewares/auth';
import { resumeUpload } from '../../middlewares/upload';

const router = Router();

// Candidate self routes
router.get('/profile/me', authenticate as any, authorize('CANDIDATE'), candidateController.getMyProfile as any);
router.put('/profile/me', authenticate as any, authorize('CANDIDATE'), candidateController.updateMyProfile as any);
router.post('/profile/resume', authenticate as any, authorize('CANDIDATE'), resumeUpload.single('resume'), candidateController.uploadResume as any);

// HR routes
router.get('/', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, candidateController.listCandidates as any);
router.get('/:id', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, candidateController.getCandidateById as any);

export default router;
