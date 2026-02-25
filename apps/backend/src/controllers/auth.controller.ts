import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { BusinessType } from '@ventasve/database';
import { env } from '../lib/env';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  businessName: z.string().min(2),
  businessSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  businessType: z.nativeEnum(BusinessType),
  whatsapp: z.string().min(10),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    const isProd = env.NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
      user: result.user,
      business: result.business,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    const isProd = env.NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const loginDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginDelivery(data);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).cookies?.refreshToken || req.body.refreshToken;
    if (!token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    const result = await authService.refreshToken(token);
    const isProd = env.NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).cookies?.refreshToken || req.body.refreshToken;
    await authService.logout(token);
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};

// Placeholders for now
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: 'Not implemented' });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: 'Not implemented' });
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: 'Not implemented' });
};
