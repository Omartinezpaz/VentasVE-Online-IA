import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { Role } from '@ventasve/database';
import * as WhatsappController from '../controllers/whatsapp.controller';

const router = Router();

router.post('/connect', authenticate, requireRole([Role.OWNER]), WhatsappController.connect);
router.get('/status', authenticate, WhatsappController.getStatus);
router.post('/disconnect', authenticate, requireRole([Role.OWNER]), WhatsappController.disconnect);

export default router;

