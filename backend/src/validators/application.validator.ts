import { z } from 'zod';

export const createApplicationSchema = z.object({
  body: z.object({
    jobId: z.string().uuid('Invalid job ID'),
    coverLetter: z.string().max(2000).optional(),
    resumeUrl: z.string().optional(),
    resumeName: z.string().optional(),
  }),
});

export const updateApplicationStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED']),
    notes: z.string().max(1000).optional(),
  }),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>['body'];
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>['body'];
