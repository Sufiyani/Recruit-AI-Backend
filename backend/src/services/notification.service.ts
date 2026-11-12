import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotificationType } from '@prisma/client';

interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  async create(data: CreateNotificationData) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || NotificationType.INFO,
        link: data.link,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  // Email-ready stub — plug in Nodemailer/Resend in Phase 2
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // TODO Phase 2: Replace with actual email provider (Nodemailer, Resend, etc.)
    console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
  }
}

export const notificationService = new NotificationService();
