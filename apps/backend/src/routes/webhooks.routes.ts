import { Router } from 'express';
import * as WebhookController from '../controllers/webhook.controller';

const router = Router();

router.get('/whatsapp', WebhookController.verifyWebhook);
router.post('/whatsapp', WebhookController.handleWebhook);

export default router;
