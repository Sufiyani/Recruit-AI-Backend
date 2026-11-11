import { z } from 'zod';

export const createJobSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(150),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    requirements: z.string().optional().nullable().or(z.literal('')),
    benefits: z.string().optional().nullable().or(z.literal('')),
    location: z.string().optional().nullable().or(z.literal('')),
    type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'HYBRID']).optional(),
    salaryMin: z.preprocess((val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)), z.number().positive().optional()),
    salaryMax: z.preprocess((val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)), z.number().positive().optional()),
    currency: z.string().optional().nullable().or(z.literal('')),
    deadline: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : String(val)), z.string().optional().nullable()),
    openings: z.preprocess((val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? 1 : Number(val)), z.number().positive().int().optional()),
  }),
});

export const updateJobSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(150).optional(),
    description: z.string().min(20).optional(),
    requirements: z.string().optional().nullable().or(z.literal('')),
    benefits: z.string().optional().nullable().or(z.literal('')),
    location: z.string().optional().nullable().or(z.literal('')),
    type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'HYBRID']).optional(),
    salaryMin: z.preprocess((val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)), z.number().positive().optional().nullable()),
    salaryMax: z.preprocess((val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)), z.number().positive().optional().nullable()),
    currency: z.string().optional().nullable().or(z.literal('')),
    deadline: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : String(val)), z.string().optional().nullable()),
    openings: z.preprocess((val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? 1 : Number(val)), z.number().positive().int().optional()),
  }),
});

export const jobQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    type: z.string().optional(),
    location: z.string().optional(),
    status: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
  params: z.object({}).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>['body'];
export type UpdateJobInput = z.infer<typeof updateJobSchema>['body'];
