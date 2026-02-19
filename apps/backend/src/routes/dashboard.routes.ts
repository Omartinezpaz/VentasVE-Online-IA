import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as DashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', DashboardController.getStats);

export default router;

