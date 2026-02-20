import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as MetaController from '../controllers/meta.controller';

const router = Router();

router.use(authenticate);

router.get('/payment-methods', MetaController.getPaymentMethods);
router.get('/business-types', MetaController.getBusinessTypes);
router.get('/banks', MetaController.getBanks);
router.get('/islr-regimens', MetaController.getIslrRegimens);
router.get('/person-types', MetaController.getPersonTypes);

export default router;

