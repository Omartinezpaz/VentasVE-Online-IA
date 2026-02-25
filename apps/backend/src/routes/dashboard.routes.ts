import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as DashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', DashboardController.getStats);
router.get('/stats/export', DashboardController.exportStats);

export default router;
