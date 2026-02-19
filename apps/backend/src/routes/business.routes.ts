import { Router } from 'express';
import * as BusinessController from '../controllers/business.controller';

const router = Router();

router.get('/me', BusinessController.getMe);
router.patch('/me', BusinessController.updateMe);
router.get('/me/stats', BusinessController.getStats);
router.post('/me/users', BusinessController.inviteUser);

export default router;
