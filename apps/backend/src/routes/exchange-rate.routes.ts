import { Router } from 'express';
import * as ExchangeRateController from '../controllers/exchange-rate.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/current', ExchangeRateController.getCurrentRate);
router.post('/', ExchangeRateController.updateRate);

export default router;
