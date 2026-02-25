import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderStatus, OrderSource, PaymentMethod, PaymentMethod as PaymentMethodEnum } from '@ventasve/database';
import { AuthRequest } from '../middleware/auth';
import { ordersService } from '../services/orders.service';
import { catalogService } from '../services/catalog.service';

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    variantSelected: z.record(z.any()).optional()
  })).min(1),
  source: z.nativeEnum(OrderSource).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  exchangeRate: z.number().positive().optional()
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethodEnum).optional(),
  shippingZoneSlug: z.string().min(1).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

const statusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'ORDERS_NOT_AUTHENTICATED'
      });
    }
    const businessId = user.businessId;
    const query = listQuerySchema.parse(req.query);
    const result = await ordersService.list(businessId, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const exportOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'ORDERS_NOT_AUTHENTICATED'
      });
    }
    const businessId = user.businessId;
    const query = listQuerySchema.parse(req.query);
    const orders = await ordersService.export(businessId, query);

    const header = ['orderNumber', 'customer', 'totalUsd', 'status', 'paymentMethod', 'createdAt'];

    const escapeCsv = (value: unknown) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = orders.map(order => {
      const totalUsd = (order.totalCents / 100).toFixed(2);
      const customerName = order.customer?.name ?? '';
      const createdAt = order.createdAt instanceof Date
        ? order.createdAt.toISOString()
        : new Date(order.createdAt).toISOString();

      const row = [
        order.orderNumber ?? '',
        customerName,
        totalUsd,
        order.status,
        order.paymentMethod ?? '',
        createdAt
      ];

      return row.map(escapeCsv).join(',');
    });

    const csv = [header.join(','), ...lines].join('\n');
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${date}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'ORDERS_NOT_AUTHENTICATED'
      });
    }
    const businessId = user.businessId;
    const data = createOrderSchema.parse(req.body);
    const result = await ordersService.create({ ...data, businessId });
    await catalogService.invalidateByBusinessId(businessId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'ORDERS_NOT_AUTHENTICATED'
      });
    }
    const businessId = user.businessId;
    const orderId = req.params.id;
    const result = await ordersService.getById(businessId, orderId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'ORDERS_NOT_AUTHENTICATED'
      });
    }
    const businessId = user.businessId;
    const orderId = req.params.id;
    const { status } = statusSchema.parse(req.body);
    const result = await ordersService.updateStatus(businessId, orderId, status);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'ORDERS_NOT_AUTHENTICATED'
      });
    }
    const businessId = user.businessId;
    const orderId = req.params.id;
    await ordersService.delete(businessId, orderId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
