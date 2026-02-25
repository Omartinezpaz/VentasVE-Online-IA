import prisma, { OrderStatus, OrderSource, PaymentMethod } from '@ventasve/database';
import { Errors } from '../lib/errors';
import { exchangeRateService } from './exchange-rate.service';
import { notificationsService } from './notifications.service';
import { emitToBusiness } from '../lib/websocket';

type CreateOrderItemInput = {
  productId: string;
  quantity: number;
  variantSelected?: Record<string, unknown>;
};

type CreateOrderInput = {
  businessId: string;
  customerId: string;
  items: CreateOrderItemInput[];
  source?: OrderSource;
  paymentMethod: PaymentMethod;
  deliveryAddress?: string;
  notes?: string;
  exchangeRate?: number;
  shippingZoneSlug?: string;
  shippingCostCents?: number;
  shippingMethodCode?: string;
};

type OrderListQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  shippingZoneSlug?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string | Date;
  dateTo?: string | Date;
};

type PublicCustomerInput = {
  phone: string;
  name?: string;
  address?: string;
  email?: string;
  addressNotes?: string;
  identification?: string;
  preferences?: Record<string, unknown>;
};

type CreatePublicOrderInput = {
  slug: string;
  customer: PublicCustomerInput;
  items: CreateOrderItemInput[];
  paymentMethod: PaymentMethod;
  notes?: string;
};

export class OrdersService {
  async create(input: CreateOrderInput) {
    if (!input.items.length) {
      throw Errors.Validation('La orden debe tener al menos un producto');
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: input.items.map(i => i.productId) },
        businessId: input.businessId,
        deletedAt: null
      }
    });

    if (products.length !== input.items.length) {
      throw Errors.Validation('Uno o más productos no existen o no pertenecen al negocio');
    }

    const itemsWithPrice = input.items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return {
        ...item,
        unitPriceCents: product.priceUsdCents
      };
    });

    const totalCents = itemsWithPrice.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );

    const result = await prisma.$transaction(async tx => {
      const order = await tx.order.create({
        data: {
          businessId: input.businessId,
          customerId: input.customerId,
          status: OrderStatus.PENDING,
          source: input.source ?? OrderSource.WEB,
          totalCents,
          exchangeRate: input.exchangeRate ?? null,
          paymentMethod: input.paymentMethod,
          deliveryAddress: input.deliveryAddress,
          notes: input.notes,
          shippingZoneSlug: input.shippingZoneSlug,
          shippingCostCents: input.shippingCostCents,
          shippingMethodCode: input.shippingMethodCode
        }
      });

      await tx.orderItem.createMany({
        data: itemsWithPrice.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          variantSelected: item.variantSelected as any
        }))
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          customer: true
        }
      });
    });

    emitToBusiness(input.businessId, 'new_order', result);

    return result;
  }

  async createPublicOrder(input: CreatePublicOrderInput) {
    const business = await prisma.business.findUnique({
      where: { slug: input.slug }
    });

    if (!business) {
      throw Errors.NotFound('Catálogo');
    }

    let customer = await prisma.customer.findFirst({
      where: {
        businessId: business.id,
        phone: input.customer.phone
      }
    });

    const customerData = {
      name: input.customer.name,
      email: input.customer.email,
      address: input.customer.address,
      addressNotes: input.customer.addressNotes,
      identification: input.customer.identification,
      preferences: input.customer.preferences as any
    };

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          phone: input.customer.phone,
          ...customerData
        }
      });
    } else if (Object.values(customerData).some(value => value !== undefined)) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          ...customerData
        }
      });
    }

    const rate = await exchangeRateService.getCurrent(business.id);
    const exchangeRate = Number(rate.usdToVes);

    const preferences = (input.customer.preferences || {}) as any;
    const shippingZoneSlug =
      typeof preferences.shippingZoneSlug === 'string' && preferences.shippingZoneSlug.trim()
        ? preferences.shippingZoneSlug.trim()
        : undefined;
    const shippingMethodCode =
      typeof preferences.shippingMethodCode === 'string' && preferences.shippingMethodCode.trim()
        ? preferences.shippingMethodCode.trim()
        : undefined;
    const shippingCostUsd =
      typeof preferences.shippingCost === 'number' && Number.isFinite(preferences.shippingCost)
        ? preferences.shippingCost
        : undefined;
    const shippingCostCents =
      shippingCostUsd !== undefined ? Math.round(shippingCostUsd * 100) : undefined;

    return this.create({
      businessId: business.id,
      customerId: customer.id,
      items: input.items,
      paymentMethod: input.paymentMethod,
      source: OrderSource.WEB,
      deliveryAddress: input.customer.address,
      notes: input.notes,
      exchangeRate,
      shippingZoneSlug,
      shippingCostCents,
      shippingMethodCode
    });
  }

  async list(businessId: string, query: OrderListQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(businessId, query);

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true
        }
      }),
      prisma.order.count({ where })
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  private buildWhere(businessId: string, query: OrderListQuery) {
    const where: any = {
      businessId
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.shippingZoneSlug) {
      where.shippingZoneSlug = {
        contains: query.shippingZoneSlug,
        mode: 'insensitive'
      };
    }

    if (query.minAmount || query.maxAmount) {
      where.totalCents = {};
      if (query.minAmount) {
        where.totalCents.gte = Math.round(query.minAmount * 100);
      }
      if (query.maxAmount) {
        where.totalCents.lte = Math.round(query.maxAmount * 100);
      }
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    return where;
  }

  async export(businessId: string, query: OrderListQuery) {
    const where = this.buildWhere(businessId, query);

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true
      }
    });

    return orders;
  }

  async getById(businessId: string, id: string) {
    const order = await prisma.order.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        payments: true
      }
    });

    if (!order) {
      throw Errors.NotFound('Orden');
    }

    return order;
  }

  async updateStatus(businessId: string, id: string, status: OrderStatus) {
    await this.getById(businessId, id);

    const order = await prisma.order.update({
      where: { id },
      data: {
        status
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        payments: true
      }
    });

    await notificationsService.onOrderStatusChanged(order.id, order.status);

    return order;
  }

  async delete(businessId: string, id: string) {
    await this.getById(businessId, id);

    await prisma.order.delete({
      where: { id }
    });

    return { success: true };
  }
}

export const ordersService = new OrdersService();
