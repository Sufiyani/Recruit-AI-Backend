import { z } from 'zod';

export const registerCompanySchema = z.object({
  body: z.object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100),
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    industry: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const candidateRegisterSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type CandidateRegisterInput = z.infer<typeof candidateRegisterSchema>['body'];
