import { Router, Request, Response, NextFunction } from 'express';
import * as CatalogController from '../controllers/catalog.controller';

const router = Router();

const cacheSeconds = 60;

const setCache = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`);
  next();
};

router.get('/:slug', setCache, CatalogController.getCatalogBySlug);
router.get('/:slug/products', setCache, CatalogController.getProducts);
router.get('/:slug/products/:id', setCache, CatalogController.getProductById);
router.post('/:slug/orders', CatalogController.createOrder);

export default router;
