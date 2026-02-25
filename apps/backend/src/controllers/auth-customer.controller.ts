import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authCustomerService } from '../services/auth-customer.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().min(7).optional(),
  businessId: z.string().min(1)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  businessId: z.string().min(1)
});

const switchSchema = z.object({
  customerId: z.string().min(1),
  targetBusinessId: z.string().min(1)
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authCustomerService.register(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authCustomerService.login(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const switchBusiness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = switchSchema.parse(req.body);
    const result = await authCustomerService.switchBusiness(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

