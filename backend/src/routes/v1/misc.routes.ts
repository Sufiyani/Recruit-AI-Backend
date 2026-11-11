import { Router } from 'express';
import { notificationController } from '../../controllers/notification.controller';
import { dashboardController, companyController } from '../../controllers/dashboard.controller';
import { authenticate, authorize, requireCompany } from '../../middlewares/auth';

const router = Router();

// Notifications
router.get('/notifications', authenticate as any, notificationController.getMyNotifications as any);
router.patch('/notifications/:id/read', authenticate as any, notificationController.markAsRead as any);
router.patch('/notifications/read-all', authenticate as any, notificationController.markAllAsRead as any);

// Dashboard
router.get('/dashboard/hr', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, dashboardController.hrDashboard as any);
router.get('/dashboard/candidate', authenticate as any, authorize('CANDIDATE'), dashboardController.candidateDashboard as any);
router.get('/dashboard/admin', authenticate as any, authorize('SUPER_ADMIN'), dashboardController.adminDashboard as any);

// Companies
router.get('/companies', authenticate as any, authorize('SUPER_ADMIN'), companyController.listCompanies as any);
router.get('/companies/my', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, companyController.getCompany as any);
router.put('/companies/:id', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, companyController.updateCompany as any);
router.get('/companies/:id/settings', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, companyController.getSettings as any);
router.put('/companies/:id/settings', authenticate as any, authorize('COMPANY_ADMIN'), requireCompany as any, companyController.updateSettings as any);

export default router;
