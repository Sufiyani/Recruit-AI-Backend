import { z } from 'zod';

export const scheduleInterviewSchema = z.object({
  body: z.object({
    applicationId: z.string().uuid('Invalid application ID'),
    title: z.string().min(3).max(150).optional(),
    scheduledAt: z.string().datetime('Invalid date-time format'),
    duration: z.number().positive().int().optional(),
    meetingLink: z.string().url('Invalid meeting link').optional().or(z.literal('')),
    notes: z.string().max(1000).optional(),
  }),
});

export const updateInterviewSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(150).optional(),
    scheduledAt: z.string().datetime().optional(),
    duration: z.number().positive().int().optional(),
    meetingLink: z.string().url().optional().or(z.literal('')),
    notes: z.string().max(1000).optional(),
    feedback: z.string().max(2000).optional(),
  }),
});

export const updateInterviewStatusSchema = z.object({
  body: z.object({
    status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']).optional(),
    applicationStatus: z.enum(['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED']).optional(),
    notes: z.string().max(2000).optional(),
    feedback: z.string().max(5000).optional(),
  }),
});

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>['body'];
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>['body'];
export type UpdateInterviewStatusInput = z.infer<typeof updateInterviewStatusSchema>['body'];

