import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma, { PaymentMethod } from '@ventasve/database';
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

export const getDocumentTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.$queryRaw<any[]>`
      SELECT id, codigo, nombre, orden
      FROM public.tipos_documento
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;
    res.json(
      data.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        orden: r.orden,
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        paymentMethods: true,
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Catálogo no encontrado', code: 'CATALOG_NOT_FOUND' });
    }

    const pm = (business.paymentMethods || {}) as any;
    const configuredCodes: string[] = [];

    if (pm.zelle && (pm.zelle.email || pm.zelle.name)) {
      configuredCodes.push('ZELLE');
    }
    if (pm.pagoMovil && (pm.pagoMovil.phone || pm.pagoMovil.bank || pm.pagoMovil.id)) {
      configuredCodes.push('PAGO_MOVIL');
    }
    if (pm.binance && pm.binance.id) {
      configuredCodes.push('BINANCE');
    }
    if (pm.transfer && (pm.transfer.account || pm.transfer.name)) {
      configuredCodes.push('TRANSFER_BS');
    }
    if (pm.cashUsd !== undefined && pm.cashUsd !== null && pm.cashUsd !== '') {
      configuredCodes.push('CASH_USD');
    }

    const catalogRows = await prisma.$queryRaw<any[]>`
      SELECT id, codigo, nombre, icono, requiere_cuenta, requiere_comprobante, orden
      FROM public.metodos_pago
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;

    const available = catalogRows
      .filter((row) => configuredCodes.includes(row.codigo))
      .map((row) => ({
        id: row.id,
        code: row.codigo,
        name: row.nombre,
        icon: row.icono,
        requiresAccount: row.requiere_cuenta,
        requiresProof: row.requiere_comprobante,
        order: row.orden,
      }));

    res.json(available);
  } catch (error) {
    next(error);
  }
};

export const getPaymentConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        paymentMethods: true,
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Catálogo no encontrado', code: 'CATALOG_NOT_FOUND' });
    }

    res.json(business.paymentMethods || {});
  } catch (error) {
    next(error);
  }
};
