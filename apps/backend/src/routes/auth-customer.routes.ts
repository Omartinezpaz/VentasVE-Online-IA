import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthCustomerController from '../controllers/auth-customer.controller';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta en 15 minutos.' }
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', writeLimiter, AuthCustomerController.register);
router.post('/login', loginLimiter, AuthCustomerController.login);
router.post('/switch-business', writeLimiter, AuthCustomerController.switchBusiness);

export default router;

