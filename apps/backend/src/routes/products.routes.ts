import { Router } from 'express';
import * as ProductsController from '../controllers/products.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { Role } from '@ventasve/database';

const router = Router();

// Todas las rutas de productos requieren autenticación (Dashboard)
router.use(authenticate);

router.get('/', ProductsController.getProducts);
router.post('/', ProductsController.createProduct);
router.get('/:id', ProductsController.getProductById);
router.patch('/:id', ProductsController.updateProduct);
router.put('/:id', ProductsController.replaceProduct);
router.delete('/:id', requireRole([Role.OWNER]), ProductsController.deleteProduct);
router.post('/:id/images', ProductsController.uploadImages);
router.patch('/:id/stock', ProductsController.updateStock);

export default router;
