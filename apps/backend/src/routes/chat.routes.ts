import { Router } from 'express';
import * as ChatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', ChatController.getConversations);
router.get('/:id/messages', ChatController.getMessages);
router.post('/:id/messages', ChatController.sendMessage);
router.patch('/:id/bot', ChatController.toggleBot);

export default router;
