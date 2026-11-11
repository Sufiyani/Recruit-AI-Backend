import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { formatApiResponse } from '../utils/helpers';

export const authController = {
  async registerCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerCompany(req.body);
      res.status(201).json(formatApiResponse(result, 'Company registered successfully', 201));
    } catch (error) { next(error); }
  },

  async registerCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerCandidate(req.body);
      res.status(201).json(formatApiResponse(result, 'Registration successful', 201));
    } catch (error) { next(error); }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(formatApiResponse(result, 'Login successful'));
    } catch (error) { next(error); }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshTokens(refreshToken);
      res.json(formatApiResponse(tokens, 'Tokens refreshed'));
    } catch (error) { next(error); }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      res.json(formatApiResponse(null, 'Logged out successfully'));
    } catch (error) { next(error); }
  },

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.userId);
      res.json(formatApiResponse(user, 'User fetched'));
    } catch (error) { next(error); }
  },
};
