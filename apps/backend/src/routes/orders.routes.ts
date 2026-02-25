import { Router } from 'express';
import * as OrdersController from '../controllers/orders.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', OrdersController.getOrders);
router.get('/export', OrdersController.exportOrders);
router.post('/', OrdersController.createOrder);
router.get('/:id', OrdersController.getOrderById);
router.patch('/:id/status', OrdersController.updateOrderStatus);
router.delete('/:id', OrdersController.deleteOrder);

export default router;
