import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import prisma, { Gender, IdType, PaymentMethod } from '@ventasve/database';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { CustomerAuthRequest } from '../middleware/auth-customer';

const updateCustomerProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional()
    .nullable(),
  gender: z.nativeEnum(Gender).optional().nullable(),
  idType: z.nativeEnum(IdType).optional().nullable(),
  idNumber: z.string().min(3).optional().nullable(),
  preferences: z.record(z.any()).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable()
});

const createCustomerPaymentMethodSchema = z.object({
  type: z.nativeEnum(PaymentMethod),
  details: z.record(z.any()),
  nickname: z.string().min(1).max(50).optional(),
  isDefault: z.boolean().optional()
});

const updateCustomerPaymentMethodSchema = z.object({
  details: z.record(z.any()).optional(),
  nickname: z.string().min(1).max(50).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional()
});

const createCustomerAddressSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  street: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(3).optional(),
  country: z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

const updateCustomerAddressSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  street: z.string().min(3).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  postalCode: z.string().min(3).optional(),
  country: z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable()
});

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
            shippingZoneSlug: true,
            shippingCostCents: true,
            shippingMethodCode: true,
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
        // address: req.body.address ?? customer.address,
        // addressNotes: req.body.addressNotes ?? customer.addressNotes,
        identification: req.body.identification ?? customer.identification,
        // preferences: req.body.preferences ?? customer.preferences
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId || !auth.businessId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: auth.customerId,
        businessId: auth.businessId
      },
      orderBy: { createdAt: 'desc' },
      include: {
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
    });

    res.json({
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: auth.customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    let profile = await prisma.customerProfile.findUnique({
      where: { customerId: customer.id }
    });

    if (!profile) {
      const name = customer.name || customer.email || 'Cliente';
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] || 'Cliente';
      const lastName = parts.slice(1).join(' ') || '';

      profile = await prisma.customerProfile.create({
        data: {
          customerId: customer.id,
          firstName,
          lastName
        }
      });
    }

    res.json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const data = updateCustomerProfileSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id: auth.customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const existingProfile = await prisma.customerProfile.findUnique({
      where: { customerId: customer.id }
    });

    const name = customer.name || customer.email || 'Cliente';
    const parts = name.trim().split(/\s+/);
    const fallbackFirstName = parts[0] || 'Cliente';
    const fallbackLastName = parts.slice(1).join(' ') || '';

    const updateData: any = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName;
    }
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }
    if (data.gender !== undefined) {
      updateData.gender = data.gender;
    }
    if (data.idType !== undefined) {
      updateData.idType = data.idType;
    }
    if (data.idNumber !== undefined) {
      updateData.idNumber = data.idNumber;
    }
    if (data.preferences !== undefined) {
      updateData.preferences = data.preferences;
    }
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }
    if (data.bio !== undefined) {
      updateData.bio = data.bio;
    }

    const profile = await prisma.customerProfile.upsert({
      where: { customerId: customer.id },
      update: updateData,
      create: {
        customerId: customer.id,
        firstName: data.firstName ?? existingProfile?.firstName ?? fallbackFirstName,
        lastName: data.lastName ?? existingProfile?.lastName ?? fallbackLastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        genero: data.gender?.toString() ?? null,
        tipodocumento: data.idType?.toString() ?? null,
        idNumber: data.idNumber ?? null,
        preferences: (data.preferences as any) ?? null,
        avatar: data.avatar ?? null,
        bio: data.bio ?? null
      }
    });

    res.json({
      message: 'Perfil actualizado exitosamente',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPaymentMethods = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const methods = await prisma.customerPaymentMethod.findMany({
      where: {
        customerId: auth.customerId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      data: methods
    });
  } catch (error) {
    next(error);
  }
};

export const createMyPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const data = createCustomerPaymentMethodSchema.parse(req.body);

    const method = await prisma.$transaction(async transaction => {
      if (data.isDefault) {
        await transaction.customerPaymentMethod.updateMany({
          where: {
            customerId: auth.customerId,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      const created = await transaction.customerPaymentMethod.create({
        data: {
          id: randomUUID(),
          customerId: auth.customerId,
          tipo: data.type,
          detalles: data.details as any,
          nickname: data.nickname,
          isDefault: data.isDefault ?? false
        }
      });

      return created;
    });

    res.status(201).json({
      data: method
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const { id } = req.params;
    const data = updateCustomerPaymentMethodSchema.parse(req.body);

    const existing = await prisma.customerPaymentMethod.findFirst({
      where: {
        id,
        customerId: auth.customerId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Método de pago no encontrado' });
    }

    const method = await prisma.$transaction(async transaction => {
      if (data.isDefault) {
        await transaction.customerPaymentMethod.updateMany({
          where: {
            customerId: auth.customerId,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      const updated = await transaction.customerPaymentMethod.update({
        where: { id: existing.id },
        data: {
          detalles: (data.details ?? existing.detalles) as any,
          nickname: data.nickname ?? existing.nickname,
          isDefault: data.isDefault ?? existing.isDefault,
          isActive: data.isActive ?? existing.isActive
        }
      });

      return updated;
    });

    res.json({
      data: method
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMyPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const { id } = req.params;

    const existing = await prisma.customerPaymentMethod.findFirst({
      where: {
        id,
        customerId: auth.customerId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Método de pago no encontrado' });
    }

    await prisma.customerPaymentMethod.delete({
      where: { id: existing.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const setMyDefaultPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const { id } = req.params;

    const existing = await prisma.customerPaymentMethod.findFirst({
      where: {
        id,
        customerId: auth.customerId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Método de pago no encontrado' });
    }

    const method = await prisma.$transaction(async transaction => {
      await transaction.customerPaymentMethod.updateMany({
        where: {
          customerId: auth.customerId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      const updated = await transaction.customerPaymentMethod.update({
        where: { id: existing.id },
        data: {
          isDefault: true,
          isActive: true
        }
      });

      return updated;
    });

    res.json({
      data: method
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const addresses = await prisma.customerAddress.findMany({
      where: {
        customerId: auth.customerId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      data: addresses
    });
  } catch (error) {
    next(error);
  }
};

export const createMyAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const data = createCustomerAddressSchema.parse(req.body);

    const address = await prisma.$transaction(async transaction => {
      if (data.isDefault) {
        await transaction.customerAddress.updateMany({
          where: {
            customerId: auth.customerId,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      const created = await transaction.customerAddress.create({
        data: {
          customerId: auth.customerId,
          label: data.label,
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country ?? 'VE',
          isDefault: data.isDefault ?? false,
          latitude: data.latitude,
          longitude: data.longitude
        }
      });

      return created;
    });

    res.status(201).json({
      data: address
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const { id } = req.params;
    const data = updateCustomerAddressSchema.parse(req.body);

    const existing = await prisma.customerAddress.findFirst({
      where: {
        id,
        customerId: auth.customerId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Dirección no encontrada' });
    }

    const address = await prisma.$transaction(async transaction => {
      if (data.isDefault) {
        await transaction.customerAddress.updateMany({
          where: {
            customerId: auth.customerId,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      const updated = await transaction.customerAddress.update({
        where: { id: existing.id },
        data: {
          label: data.label ?? existing.label,
          street: data.street ?? existing.street,
          city: data.city ?? existing.city,
          state: data.state ?? existing.state,
          postalCode: data.postalCode ?? existing.postalCode,
          country: data.country ?? existing.country,
          isDefault: data.isDefault ?? existing.isDefault,
          latitude:
            data.latitude !== undefined ? data.latitude : existing.latitude,
          longitude:
            data.longitude !== undefined ? data.longitude : existing.longitude
        }
      });

      return updated;
    });

    res.json({
      data: address
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMyAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const { id } = req.params;

    const existing = await prisma.customerAddress.findFirst({
      where: {
        id,
        customerId: auth.customerId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Dirección no encontrada' });
    }

    await prisma.customerAddress.delete({
      where: { id: existing.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const setMyDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerReq = req as CustomerAuthRequest;
    const auth = customerReq.customer;

    if (!auth || !auth.customerId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'CUSTOMER_NOT_AUTHENTICATED'
      });
    }

    const { id } = req.params;

    const existing = await prisma.customerAddress.findFirst({
      where: {
        id,
        customerId: auth.customerId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Dirección no encontrada' });
    }

    const address = await prisma.$transaction(async transaction => {
      await transaction.customerAddress.updateMany({
        where: {
          customerId: auth.customerId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      const updated = await transaction.customerAddress.update({
        where: { id: existing.id },
        data: {
          isDefault: true
        }
      });

      return updated;
    });

    res.json({
      data: address
    });
  } catch (error) {
    next(error);
  }
};
