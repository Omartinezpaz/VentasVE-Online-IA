import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as GeoController from '../controllers/geo.controller';

const router = Router();

router.use(authenticate);

router.get('/estados', GeoController.getEstados);
router.get('/municipios/:estadoId', GeoController.getMunicipios);
router.get('/parroquias/:municipioId', GeoController.getParroquias);

export default router;

