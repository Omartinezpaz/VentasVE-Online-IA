import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { productsService } from '../services/products.service';
import { imageUploadService, upload } from '../services/image-upload.service';
import { catalogService } from '../services/catalog.service';

const productBaseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  priceUsdCents: z.number().int().nonnegative('El precio debe ser un entero positivo (centavos)'),
  costCents: z.number().int().nonnegative('El costo debe ser un entero positivo (centavos)').optional(),
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

const productSchema = productBaseSchema.superRefine((val, ctx) => {
  if (typeof val.costCents === 'number' && typeof val.priceUsdCents === 'number') {
    if (val.costCents > val.priceUsdCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['costCents'],
        message: 'El costo no puede ser mayor que el precio'
      });
    }
  }
});

const querySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  isPublished: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    // Assume protected route
    const businessId = authReq.user!.businessId;
    const query = querySchema.parse(req.query);
    const result = await productsService.findAll(businessId, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const data = productSchema.parse(req.body);
    const result = await productsService.create({ ...data, businessId });
    await catalogService.invalidateByBusinessId(businessId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const productId = req.params.id;
    const result = await productsService.findOne(businessId, productId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const productId = req.params.id;
    const data = productBaseSchema.partial().parse(req.body);
    const result = await productsService.update(businessId, productId, data);
    await catalogService.invalidateByBusinessId(businessId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const replaceProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const productId = req.params.id;
    const data = productSchema.parse(req.body);
    const result = await productsService.update(businessId, productId, data);
    await catalogService.invalidateByBusinessId(businessId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const productId = req.params.id;
    await productsService.delete(businessId, productId);
    await catalogService.invalidateByBusinessId(businessId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const businessId = authReq.user!.businessId;
        const productId = req.params.id;
        const schema = z.object({ stock: z.number().int().nonnegative() });
        const { stock } = schema.parse(req.body);
        const result = await productsService.update(businessId, productId, { stock });
        await catalogService.invalidateByBusinessId(businessId);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

export const uploadImages = [
  upload.array('images', 5), // Máximo 5 imágenes
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
      
      // Obtener producto actual para combinar imágenes
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
