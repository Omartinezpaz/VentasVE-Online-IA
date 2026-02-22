import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as SettingsController from '../controllers/settings.controller';
import * as ShippingZonesController from '../controllers/shipping-zones.controller';

const router = Router();

router.use(authenticate);

router.get('/', SettingsController.getSettings);
router.patch('/', SettingsController.updateSettings);
router.post('/logo', SettingsController.uploadLogo);

router.get('/shipping-zones', ShippingZonesController.getShippingZones);
router.post('/shipping-zones', ShippingZonesController.createShippingZone);
router.put('/shipping-zones/:id', ShippingZonesController.updateShippingZone);
router.delete('/shipping-zones/:id', ShippingZonesController.deleteShippingZone);
router.post(
  '/shipping-zones/validate-coverage',
  ShippingZonesController.validateCoverage
);

export default router;
