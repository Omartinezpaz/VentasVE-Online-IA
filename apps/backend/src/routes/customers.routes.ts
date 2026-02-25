import { Router } from 'express';
import * as CustomersController from '../controllers/customers.controller';
import { authenticate } from '../middleware/auth';
import { authenticateCustomer } from '../middleware/auth-customer';

const router = Router();

router.use(authenticate);

router.get('/', CustomersController.getCustomers);
router.get('/:id', CustomersController.getCustomerById);
router.patch('/:id', CustomersController.updateCustomer);

router.get('/me/orders', authenticateCustomer, CustomersController.getMyOrders);
router.get('/me/profile', authenticateCustomer, CustomersController.getMyProfile);
router.patch('/me/profile', authenticateCustomer, CustomersController.updateMyProfile);
router.get(
  '/me/payment-methods',
  authenticateCustomer,
  CustomersController.getMyPaymentMethods
);
router.post(
  '/me/payment-methods',
  authenticateCustomer,
  CustomersController.createMyPaymentMethod
);
router.patch(
  '/me/payment-methods/:id',
  authenticateCustomer,
  CustomersController.updateMyPaymentMethod
);
router.delete(
  '/me/payment-methods/:id',
  authenticateCustomer,
  CustomersController.deleteMyPaymentMethod
);
router.patch(
  '/me/payment-methods/:id/default',
  authenticateCustomer,
  CustomersController.setMyDefaultPaymentMethod
);

router.get('/me/addresses', authenticateCustomer, CustomersController.getMyAddresses);
router.post('/me/addresses', authenticateCustomer, CustomersController.createMyAddress);
router.patch(
  '/me/addresses/:id',
  authenticateCustomer,
  CustomersController.updateMyAddress
);
router.delete(
  '/me/addresses/:id',
  authenticateCustomer,
  CustomersController.deleteMyAddress
);
router.patch(
  '/me/addresses/:id/default',
  authenticateCustomer,
  CustomersController.setMyDefaultAddress
);

export default router;
