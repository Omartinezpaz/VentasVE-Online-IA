import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const injectTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.businessId) {
    // Already injected by auth
    return next();
  }
  
  // For public routes (catalog), we might need to extract from slug
  // This middleware ensures businessId is available if needed
  next();
};
