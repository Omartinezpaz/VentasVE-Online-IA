import { Router } from 'express';
import * as CustomersController from '../controllers/customers.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', CustomersController.getCustomers);
router.get('/:id', CustomersController.getCustomerById);
router.patch('/:id', CustomersController.updateCustomer);

export default router;
