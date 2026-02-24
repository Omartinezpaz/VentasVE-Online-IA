import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { productsService } from '../services/products.service';
import { imageUploadService, upload } from '../services/image-upload.service';
import { catalogService } from '../services/catalog.service';
import { authed, authedWithStatus } from '../lib/handler';

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  priceUsdCents: z.number().int().nonnegative('El precio debe ser un entero positivo (centavos)'),
  categoryId: z.string().uuid().optional(),
  images: z.array(
    z.string().refine(
      (v) => /^https?:\/\//.test(v) || v.startsWith('/uploads/'),
      'URL de imagen inválida'
    )
  ).optional(),
  stock: z.number().int().nonnegative().default(0),
  variants: z.any().optional(),
  attributes: z.any().optional(),
  isPublished: z.boolean().default(true),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  isPublished: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

const stockSchema = z.object({ stock: z.number().int().nonnegative() });

export const getProducts = authed(async ({ businessId, query }) => {
  const parsed = querySchema.parse(query);
  return productsService.findAll(businessId, parsed);
});

export const createProduct = authedWithStatus(201, async ({ businessId, body }) => {
  const data = productSchema.parse(body);
  const result = await productsService.create({ ...data, businessId });
  await catalogService.invalidateByBusinessId(businessId);
  return result;
});

export const getProductById = authed(async ({ businessId, params }) => {
  return productsService.findOne(businessId, params.id);
});

export const updateProduct = authed(async ({ businessId, params, body }) => {
  const data = productSchema.partial().parse(body);
  const result = await productsService.update(businessId, params.id, data);
  await catalogService.invalidateByBusinessId(businessId);
  return result;
});

export const replaceProduct = authed(async ({ businessId, params, body }) => {
  const data = productSchema.parse(body);
  const result = await productsService.update(businessId, params.id, data);
  await catalogService.invalidateByBusinessId(businessId);
  return result;
});

export const deleteProduct = authed(async ({ businessId, params }) => {
  await productsService.delete(businessId, params.id);
  await catalogService.invalidateByBusinessId(businessId);
  return null;
});

export const updateStock = authed(async ({ businessId, params, body }) => {
  const { stock } = stockSchema.parse(body);
  const result = await productsService.update(businessId, params.id, { stock });
  await catalogService.invalidateByBusinessId(businessId);
  return result;
});

// uploadImages keeps raw req/res because of multer middleware
export const uploadImages = [
  upload.array('images', 5),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const businessId = authReq.user!.businessId;
      const productId = req.params.id;

      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: 'No se proporcionaron imágenes' });
      }

      const files = req.files as Express.Multer.File[];
      const imageUrls = await imageUploadService.uploadProductImages(files);

      const currentProduct = await productsService.findOne(businessId, productId);
      const updatedImages = [...(currentProduct.images || []), ...imageUrls];
      const result = await productsService.update(businessId, productId, { images: updatedImages });
      await catalogService.invalidateByBusinessId(businessId);

      res.json({
        message: 'Imágenes subidas exitosamente',
        images: imageUrls,
        product: result
      });
    } catch (error) {
      next(error);
    }
  }
];
