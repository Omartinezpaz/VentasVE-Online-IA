import prisma, { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@ventasve/database';
import { Errors } from '../lib/errors';

type PaymentListOptions = {
  page?: number;
  limit?: number;
  status?: string;
  orderId?: string;
};

type CreatePaymentInput = {
  orderId: string;
  method: PaymentMethod;
  reference?: string;
  proofImageUrl?: string;
  notes?: string;
};

type VerifyPaymentInput = {
  status: PaymentStatus;
  notes?: string;
};

const PAYMENT_INCLUDE = {
  order: {
    select: { id: true, orderNumber: true, totalCents: true, customer: true },
  },
} satisfies Prisma.PaymentInclude;

export class PaymentsService {
  async list(businessId: string, options: PaymentListOptions) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      order: { businessId },
    };

    if (options.status) where.status = options.status as PaymentStatus;
    if (options.orderId) where.orderId = options.orderId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(businessId: string, input: CreatePaymentInput) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, businessId },
    });

    if (!order) {
      throw Errors.NotFound('Orden');
    }

    return prisma.payment.create({
      data: {
        orderId: input.orderId,
        businessId,
        method: input.method,
        amountCents: order.totalCents,
        currency: 'USD',
        reference: input.reference,
        proofImageUrl: input.proofImageUrl,
        notes: input.notes,
      },
      include: PAYMENT_INCLUDE,
    });
  }

  async verify(businessId: string, paymentId: string, verifiedBy: string, input: VerifyPaymentInput) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, order: { businessId } },
    });

    if (!payment) {
      throw Errors.NotFound('Pago');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: input.status,
          verifiedBy,
          verifiedAt: new Date(),
          notes: input.notes
            ? `${payment.notes || ''}\nVerificación: ${input.notes}`
            : payment.notes,
        },
        include: PAYMENT_INCLUDE,
      });

      let confirmedOrder: { id: string; status: string } | null = null;

      if (input.status === PaymentStatus.VERIFIED) {
        confirmedOrder = await tx.order.update({
          where: { id: updated.orderId },
          data: { status: OrderStatus.CONFIRMED },
          select: { id: true, status: true },
        });
      }

      return { payment: updated, confirmedOrder };
    });
  }

  async reject(businessId: string, paymentId: string, rejectedBy: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, order: { businessId } },
    });

    if (!payment) {
      throw Errors.NotFound('Pago');
    }

    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REJECTED,
        verifiedBy: rejectedBy,
        verifiedAt: new Date(),
      },
      include: PAYMENT_INCLUDE,
    });
  }
}

export const paymentsService = new PaymentsService();
