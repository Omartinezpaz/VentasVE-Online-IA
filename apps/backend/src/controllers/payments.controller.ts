import { Request, Response, NextFunction } from 'express';
import prisma from '@ventasve/database';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { emitToBusiness } from '../lib/websocket';

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(['ZELLE', 'PAGO_MOVIL', 'TRANSFER_BS', 'BINANCE', 'CASH_USD', 'TRANSFER_BS']),
  reference: z.string().optional(),
  imageUrl: z.string().url().optional(),
  notes: z.string().optional()
});

const verifyPaymentSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional()
});

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const reqLog = (req as any).log;

    const page = Number((req.query.page as string) ?? '1');
    const limit = Number((req.query.limit as string) ?? '20');
    const status = (req.query.status as string | undefined) ?? undefined;
    const orderId = (req.query.orderId as string | undefined) ?? undefined;
    const skip = (page - 1) * limit;

    const where: any = {
      order: {
        businessId
      }
    };

    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            select: { id: true, orderNumber: true, totalCents: true, customer: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.payment.count({ where })
    ]);

    reqLog?.info({ total, page, limit, status, orderId }, 'Payments list');
    res.json({
      data: payments,
      meta: { page, limit, total }
    });
  } catch (error) {
    const reqLog = (req as any).log;
    reqLog?.error({ error }, 'Error in getPayments');
    next(error);
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const data = createPaymentSchema.parse(req.body);
    const reqLog = (req as any).log;
    reqLog?.info({ orderId: data.orderId, method: data.method }, 'Creating payment');

    const order = await prisma.order.findFirst({
      where: { id: data.orderId, businessId }
    });

    if (!order) {
      reqLog?.warn({ orderId: data.orderId }, 'Order not found for payment');
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method,
        amountCents: order.totalCents,
        currency: 'USD',
        reference: data.reference,
        imageUrl: data.imageUrl,
        notes: data.notes
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, totalCents: true, customer: true }
        }
      }
    });

    emitToBusiness(businessId, 'new_payment', payment);
    reqLog?.info({ paymentId: payment.id }, 'Payment created');

    res.status(201).json(payment);
  } catch (error) {
    const reqLog = (req as any).log;
    reqLog?.error({ error }, 'Error in createPayment');
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { id } = req.params;
    const data = verifyPaymentSchema.parse(req.body);
    const reqLog = (req as any).log;

    const payment = await prisma.payment.findFirst({
      where: { id, order: { businessId } }
    });

    if (!payment) {
      reqLog?.warn({ paymentId: id }, 'Payment not found');
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: data.status,
        verifiedBy: authReq.user!.id,
        verifiedAt: new Date(),
        notes: data.notes ? `${payment.notes || ''}\nVerificación: ${data.notes}` : payment.notes
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, totalCents: true, customer: true }
        }
      }
    });

    if (data.status === 'VERIFIED') {
      const order = await prisma.order.update({
        where: { id: updated.orderId },
        data: { status: 'CONFIRMED' as any }
      });

      emitToBusiness(businessId, 'order_status_changed', {
        orderId: order.id,
        status: order.status
      });
      reqLog?.info({ paymentId: updated.id, orderId: order.id }, 'Payment verified and order confirmed');
    }

    emitToBusiness(businessId, 'payment_verified', updated);
    reqLog?.info({ paymentId: updated.id }, 'Payment status updated');

    res.json(updated);
  } catch (error) {
    const reqLog = (req as any).log;
    reqLog?.error({ error }, 'Error in verifyPayment');
    next(error);
  }
};

export const rejectPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { id } = req.params;
    const reqLog = (req as any).log;

    const payment = await prisma.payment.findFirst({
      where: { id, order: { businessId } }
    });

    if (!payment) {
      reqLog?.warn({ paymentId: id }, 'Payment not found');
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        verifiedBy: authReq.user!.id,
        verifiedAt: new Date()
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, totalCents: true, customer: true }
        }
      }
    });

    emitToBusiness(businessId, 'payment_verified', updated);
    reqLog?.info({ paymentId: updated.id }, 'Payment rejected');

    res.json(updated);
  } catch (error) {
    const reqLog = (req as any).log;
    reqLog?.error({ error }, 'Error in rejectPayment');
    next(error);
  }
};

export const getPaymentConfig = async (req: Request, res: Response) => {
  res.json({ message: 'Get payment config endpoint' });
};

export const updatePaymentConfig = async (req: Request, res: Response) => {
  res.json({ message: 'Update payment config endpoint' });
};
