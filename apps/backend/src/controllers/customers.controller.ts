import prisma, { Prisma } from '@ventasve/database';
import { Errors } from '../lib/errors';
import { authed } from '../lib/handler';

export const getCustomers = authed(async ({ businessId, query }) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const search = query.search as string | undefined;

  const where: Record<string, unknown> = { businessId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { orders: true }
        },
        orders: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            createdAt: true,
            totalCents: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.customer.count({ where })
  ]);

  return {
    data: customers,
    meta: { page, limit, total }
  };
});

export const getCustomerById = authed(async ({ businessId, params }) => {
  const customer = await prisma.customer.findFirst({
    where: {
      id: params.id,
      businessId
    },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          totalCents: true,
          shipping_zone_slug: true,
          shipping_cost_cents: true,
          shipping_method_code: true,
          items: {
            select: {
              quantity: true,
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      },
      conversations: {
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      }
    }
  });

  if (!customer) {
    throw Errors.NotFound('Cliente');
  }

  return customer;
});

export const updateCustomer = authed(async ({ businessId, params, body }) => {
  const customer = await prisma.customer.findFirst({
    where: {
      id: params.id,
      businessId
    }
  });

  if (!customer) {
    throw Errors.NotFound('Cliente');
  }

  const data = body as Record<string, unknown>;
  return prisma.customer.update({
    where: { id: params.id },
    data: {
      name: (data.name as string) ?? customer.name,
      email: (data.email as string) ?? customer.email,
      phone: (data.phone as string) ?? customer.phone,
      address: (data.address as string) ?? customer.address,
      addressNotes: (data.addressNotes as string) ?? customer.addressNotes,
      identification: (data.identification as string) ?? customer.identification,
      preferences: (data.preferences ?? customer.preferences ?? Prisma.JsonNull) as Prisma.InputJsonValue
    }
  });
});
