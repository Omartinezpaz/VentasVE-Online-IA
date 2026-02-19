import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentMethod } from '@ventasve/database';
import { catalogService } from '../services/catalog.service';
import { ordersService } from '../services/orders.service';

const publicOrderSchema = z.object({
  customer: z.object({
    phone: z.string().min(5),
    name: z.string().optional(),
    address: z.string().optional(),
    email: z.string().email().optional(),
    addressNotes: z.string().optional(),
    identification: z.string().optional(),
    preferences: z.record(z.any()).optional()
  }),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    variantSelected: z.record(z.any()).optional()
  })).min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  notes: z.string().optional()
});

export const getCatalogBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const catalog = await catalogService.getCatalogBySlug(slug);
  if (!catalog) {
    return res.status(404).json({ error: 'Catálogo no encontrado', code: 'CATALOG_NOT_FOUND' });
  }
  res.json(catalog);
};

export const getProducts = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const products = await catalogService.getProducts(slug);
  if (!products) {
    return res.status(404).json({ error: 'Catálogo no encontrado', code: 'CATALOG_NOT_FOUND' });
  }
  res.json({ data: products });
};

export const getProductById = async (req: Request, res: Response) => {
  const { slug, id } = req.params;
  const product = await catalogService.getProductById(slug, id);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado', code: 'PRODUCT_NOT_FOUND' });
  }
  res.json(product);
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const data = publicOrderSchema.parse(req.body);
    const order = await ordersService.createPublicOrder({
      slug,
      customer: data.customer,
      items: data.items,
      paymentMethod: data.paymentMethod,
      notes: data.notes
    });

    await catalogService.invalidateBySlug(slug);

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};
