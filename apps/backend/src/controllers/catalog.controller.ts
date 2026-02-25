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
    const data = await prisma.documentType.findMany({
      where: { activo: true },
      orderBy: [
        { orden: 'asc' },
        { nombre: 'asc' }
      ],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        orden: true
      }
    });

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

    const catalogRows = await prisma.metodoPago.findMany({
      where: { activo: true },
      orderBy: [
        { orden: 'asc' },
        { nombre: 'asc' }
      ],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        icono: true,
        requiereCuenta: true,
        requiereComprobante: true,
        orden: true
      }
    });

    const available = catalogRows
      .filter((row) => configuredCodes.includes(row.codigo))
      .map((row) => ({
        id: row.id,
        code: row.codigo,
        name: row.nombre,
        icon: row.icono,
        requiresAccount: row.requiereCuenta,
        requiresProof: row.requiereComprobante,
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

export const getShippingZones = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const amountParam = (req.query.amount as string) ?? '0';
    const cartAmount = Number.parseFloat(amountParam) || 0;

    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        settings: true
      }
    });

    if (!business) {
      return res.status(404).json({ error: 'Catálogo no encontrado', code: 'CATALOG_NOT_FOUND' });
    }

    const settings = (business.settings as any) || {};
    const shippingZones = Array.isArray(settings.shippingZones) ? settings.shippingZones : [];
    const shippingOptions = settings.shippingOptions || {};

    const zones = shippingZones.map((zone: any, index: number) => {
      const basePrice = typeof zone.price === 'number' && Number.isFinite(zone.price) ? zone.price : 0;
      const zoneFree = Boolean(zone.free);
      const freeOverEnabled =
        typeof shippingOptions.freeShippingEnabled === 'boolean' &&
        shippingOptions.freeShippingEnabled === true &&
        typeof shippingOptions.freeShippingMin === 'number' &&
        Number.isFinite(shippingOptions.freeShippingMin) &&
        cartAmount >= shippingOptions.freeShippingMin;

      const isFree = zoneFree || freeOverEnabled;
      const cost = isFree ? 0 : basePrice;
      const formattedCost = isFree ? 'Gratis' : `$${cost.toFixed(2)}`;

      return {
        id: index + 1,
        name: zone.name as string,
        slug: zone.slug as string,
        estadoId:
          typeof zone.estadoId === 'number' && Number.isFinite(zone.estadoId) ? (zone.estadoId as number) : null,
        municipioId:
          typeof zone.municipioId === 'number' && Number.isFinite(zone.municipioId)
            ? (zone.municipioId as number)
            : null,
        parroquiaId:
          typeof zone.parroquiaId === 'number' && Number.isFinite(zone.parroquiaId)
            ? (zone.parroquiaId as number)
            : null,
        description:
          typeof zone.distanceKm === 'number' && Number.isFinite(zone.distanceKm)
            ? `Hasta ${zone.distanceKm} km desde la tienda`
            : (zone.description as string | null) ?? null,
        deliveryTime: (zone.deliveryTime as string | null) ?? null,
        methods: [
          {
            methodId: 1,
            methodCode: 'DELIVERY',
            methodName: 'Entrega a domicilio',
            icon: null,
            cost,
            isFree,
            costType: 'fixed',
            costValue: basePrice,
            minOrderAmount:
              typeof shippingOptions.freeShippingMin === 'number' && Number.isFinite(shippingOptions.freeShippingMin)
                ? shippingOptions.freeShippingMin
                : 0,
            formattedCost
          }
        ]
      };
    });

    return res.json({
      zones,
      currency: 'USD',
      cartAmount
    });
  } catch (error) {
    next(error);
  }
};
