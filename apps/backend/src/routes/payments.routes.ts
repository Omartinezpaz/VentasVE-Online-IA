import { Router } from 'express';
import * as PaymentsController from '../controllers/payments.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', PaymentsController.getPayments);
router.post('/', PaymentsController.createPayment);
router.patch('/:id/verify', PaymentsController.verifyPayment);
router.patch('/:id/reject', PaymentsController.rejectPayment);
router.get('/config', PaymentsController.getPaymentConfig);
router.put('/config', PaymentsController.updatePaymentConfig);

export default router;
