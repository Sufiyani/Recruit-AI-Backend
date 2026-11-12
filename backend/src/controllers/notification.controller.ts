import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { formatApiResponse } from '../utils/helpers';

export const notificationController = {
  async getMyNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.getUserNotifications(
        req.user!.userId,
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20
      );
      res.json(formatApiResponse(result, 'Notifications fetched'));
    } catch (error) { next(error); }
  },

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAsRead(req.params.id as string, req.user!.userId);
      res.json(formatApiResponse(null, 'Notification marked as read'));
    } catch (error) { next(error); }
  },

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllAsRead(req.user!.userId);
      res.json(formatApiResponse(null, 'All notifications marked as read'));
    } catch (error) { next(error); }
  },
};
