import { z } from 'zod';
import { OrderStatus, OrderSource, PaymentMethod } from '@ventasve/database';
import { ordersService } from '../services/orders.service';
import { catalogService } from '../services/catalog.service';
import { authed, authedWithStatus } from '../lib/handler';

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
  status: z.nativeEnum(OrderStatus).optional()
});

const statusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});

export const getOrders = authed(async ({ businessId, query }) => {
  const parsed = listQuerySchema.parse(query);
  return ordersService.list(businessId, parsed);
});

export const createOrder = authedWithStatus(201, async ({ businessId, body }) => {
  const data = createOrderSchema.parse(body);
  const result = await ordersService.create({ ...data, businessId });
  await catalogService.invalidateByBusinessId(businessId);
  return result;
});

export const getOrderById = authed(async ({ businessId, params }) => {
  return ordersService.getById(businessId, params.id);
});

export const updateOrderStatus = authed(async ({ businessId, params, body }) => {
  const { status } = statusSchema.parse(body);
  return ordersService.updateStatus(businessId, params.id, status);
});

export const deleteOrder = authed(async ({ businessId, params }) => {
  await ordersService.delete(businessId, params.id);
  return null;
});
