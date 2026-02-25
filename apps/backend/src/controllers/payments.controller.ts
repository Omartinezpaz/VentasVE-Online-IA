import { Request, Response } from 'express';
import { PaymentMethod, PaymentStatus } from '@ventasve/database';
import { z } from 'zod';
import { authed, authedWithStatus } from '../lib/handler';
import { paymentsService } from '../services/payments.service';
import { emitToBusiness } from '../lib/websocket';

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  proofImageUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const verifyPaymentSchema = z.object({
  status: z.nativeEnum(PaymentStatus),
  notes: z.string().optional(),
});

export const getPayments = authed(async (ctx) => {
  return paymentsService.list(ctx.businessId, {
    page: Number(ctx.query.page ?? '1'),
    limit: Number(ctx.query.limit ?? '20'),
    status: ctx.query.status,
    orderId: ctx.query.orderId,
  });
});

export const createPayment = authedWithStatus(201, async (ctx) => {
  const data = createPaymentSchema.parse(ctx.body);
  const payment = await paymentsService.create(ctx.businessId, data);
  emitToBusiness(ctx.businessId, 'new_payment', payment);
  return { data: payment };
});

export const verifyPayment = authed(async (ctx) => {
  const data = verifyPaymentSchema.parse(ctx.body);
  const { payment, confirmedOrder } = await paymentsService.verify(
    ctx.businessId,
    ctx.params.id,
    ctx.userId,
    data,
  );

  if (confirmedOrder) {
    emitToBusiness(ctx.businessId, 'order_status_changed', {
      orderId: confirmedOrder.id,
      status: confirmedOrder.status,
    });
  }

  emitToBusiness(ctx.businessId, 'payment_verified', payment);
  return { data: payment };
});

export const rejectPayment = authed(async (ctx) => {
  const payment = await paymentsService.reject(ctx.businessId, ctx.params.id, ctx.userId);
  emitToBusiness(ctx.businessId, 'payment_verified', payment);
  return { data: payment };
});

export const getPaymentConfig = async (_req: Request, res: Response) => {
  res.json({ message: 'Get payment config endpoint' });
};

export const updatePaymentConfig = async (_req: Request, res: Response) => {
  res.json({ message: 'Update payment config endpoint' });
};
