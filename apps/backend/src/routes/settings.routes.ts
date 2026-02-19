import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as SettingsController from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

router.get('/', SettingsController.getSettings);
router.patch('/', SettingsController.updateSettings);

export default router;

