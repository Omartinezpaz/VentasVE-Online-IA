import { Request, Response, NextFunction } from 'express';
import prisma from '@ventasve/database';
import { AuthRequest } from '../middleware/auth';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = req.query.search as string | undefined;

    const where: any = { businessId };

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

    res.json({
      data: customers,
      meta: {
        page,
        limit,
        total
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
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
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(customer);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: req.body.name ?? customer.name,
        email: req.body.email ?? customer.email,
        phone: req.body.phone ?? customer.phone,
        address: req.body.address ?? customer.address,
        addressNotes: req.body.addressNotes ?? customer.addressNotes,
        identification: req.body.identification ?? customer.identification,
        preferences: req.body.preferences ?? customer.preferences
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
