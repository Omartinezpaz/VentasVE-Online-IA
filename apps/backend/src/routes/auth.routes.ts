import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthController from '../controllers/auth.controller';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta en 15 minutos.' }
});

const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authWriteLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/login-delivery', loginLimiter, AuthController.loginDelivery);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authWriteLimiter, AuthController.logout);
router.post('/verify-email', authWriteLimiter, AuthController.verifyEmail);
router.post('/forgot-password', authWriteLimiter, AuthController.forgotPassword);
router.post('/reset-password', authWriteLimiter, AuthController.resetPassword);

export default router;
