import { Router, Request, Response, NextFunction } from 'express';
import * as CatalogController from '../controllers/catalog.controller';
import * as DeliveryController from '../controllers/delivery.controller';

const router = Router();

const cacheSeconds = 60;

const setCache = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`);
  next();
};

router.get('/document-types', setCache, CatalogController.getDocumentTypes);
router.get('/:slug/payment-methods', setCache, CatalogController.getPaymentMethods);
router.get('/:slug/payment-config', setCache, CatalogController.getPaymentConfig);
router.get('/:slug', setCache, CatalogController.getCatalogBySlug);
router.get('/:slug/products', setCache, CatalogController.getProducts);
router.get('/:slug/products/:id', setCache, CatalogController.getProductById);
router.post('/:slug/orders', CatalogController.createOrder);
router.get('/:slug/shipping-zones', setCache, CatalogController.getShippingZones);
router.post('/delivery/ratings', DeliveryController.createDeliveryRatingPublic);

export default router;
