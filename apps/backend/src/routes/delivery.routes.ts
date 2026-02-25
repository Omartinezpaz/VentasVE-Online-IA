import { Router } from 'express';
import * as DeliveryController from '../controllers/delivery.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/persons', DeliveryController.listDeliveryPersons);
router.get('/orders/:orderId', DeliveryController.getDeliveryOrderByOrderId);
router.post('/orders/:orderId/assign', DeliveryController.assignDelivery);
router.post('/orders/:orderId/confirm-otp', DeliveryController.confirmOtp);

export default router;
