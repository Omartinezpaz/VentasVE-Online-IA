import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../lib/errors';

// Esquemas de validación
const assignDeliverySchema = z.object({
  orderId: z.string().uuid(),
  deliveryPersonId: z.string().uuid(),
  notes: z.string().optional()
});

const confirmOtpSchema = z.object({
  orderId: z.string().uuid(),
  otp: z.string().length(6),
  deliveryPersonId: z.string().uuid().optional()
});

const ratingSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  deliveryPersonId: z.string().uuid()
});

export const listDeliveryPersons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    if (!user || !user.businessId) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'DELIVERY_NOT_AUTHENTICATED'
      });
    }

    const businessId = user.businessId;

    // Refactorizado a Prisma Client
    const persons = await prisma.deliveryPerson.findMany({
      where: {
        businessId: businessId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicleType: true,
        plateNumber: true,
        isAvailable: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return res.json({
      persons
    });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryOrderByOrderId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;

    // Refactorizado a Prisma Client
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { orderId }
    });

    if (!deliveryOrder) {
      return res.json({ deliveryOrder: null });
    }

    return res.json({ deliveryOrder });
  } catch (error) {
    next(error);
  }
};

export const assignDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = {
      ...req.body,
      orderId: req.params.orderId || req.body.orderId
    };
    const result = assignDeliverySchema.safeParse(body);

    if (!result.success) {
      throw new AppError('Datos inválidos', 400);
    }

    const { orderId, deliveryPersonId, notes } = result.data;

    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new AppError('Orden no encontrada', 404);
    }

    // Verificar delivery person
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: deliveryPersonId }
    });

    if (!deliveryPerson) {
      throw new AppError('Repartidor no encontrado', 404);
    }

    // Generar OTP de 6 dígitos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Obtener dirección del cliente y tienda
    const business = await prisma.business.findUnique({
      where: { id: order.businessId },
      select: { 
        store_address: true,
        store_latitude: true,
        store_longitude: true
      }
    });

    const pickupAddress = business?.store_address || 'Tienda Principal';
    
    // Intentar construir dirección de entrega desde la orden
    const deliveryAddress = order.deliveryAddress || order.shippingZoneSlug || 'Dirección del cliente';

    // Crear delivery order y actualizar estado de la orden en una transacción
    const deliveryOrder = await prisma.$transaction(async (tx) => {
      // 1. Crear delivery order
      const newDelivery = await tx.deliveryOrder.create({
        data: {
          deliveryPersonId,
          businessId: order.businessId,
          status: 'ASSIGNED',
          orderId,
          pickupAddress,
          deliveryAddress,
          pickupLatitude: business?.store_latitude,
          pickupLongitude: business?.store_longitude,
          deliveryLatitude: order.deliveryLatitude,
          deliveryLongitude: order.deliveryLongitude,
          deliveryFee: order.shippingCostCents ? order.shippingCostCents / 100 : 0, // Usar costo de envío de la orden
          platformCommission: 0,
          otpCode: otp
        }
      });

      // 2. Actualizar estado de la orden principal
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'SHIPPED' } // Asumimos que hay un estado DISPATCHED o similar
      });

      return newDelivery;
    });

    return res.status(201).json({
      success: true,
      deliveryOrder
    });
  } catch (error) {
    next(error);
  }
};

export const confirmOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = {
      ...req.body,
      orderId: req.params.orderId || req.body.orderId,
      otp: req.body.otp || req.body.otpCode
    };
    const result = confirmOtpSchema.safeParse(body);

    if (!result.success) {
      throw new AppError('Datos inválidos', 400);
    }

    const { orderId, otp, deliveryPersonId } = result.data;

    // Buscar la orden de delivery
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { orderId }
    });

    if (!deliveryOrder) {
      throw new AppError('Orden de delivery no encontrada', 404);
    }

    if (deliveryPersonId && deliveryOrder.deliveryPersonId !== deliveryPersonId) {
      throw new AppError('Esta orden no pertenece a este repartidor', 403);
    }

    if (deliveryOrder.status === 'DELIVERED') {
      throw new AppError('Esta orden ya fue entregada', 400);
    }

    if (deliveryOrder.otpCode !== otp) {
      throw new AppError('Código OTP incorrecto', 400);
    }

    const actualDeliveryPersonId = deliveryOrder.deliveryPersonId;
    if (!actualDeliveryPersonId) {
       throw new AppError('Orden no asignada a ningún repartidor', 400);
    }

    // Confirmar entrega en transacción
    const updatedDelivery = await prisma.$transaction(async (tx) => {
      // 1. Actualizar delivery order
      const updated = await tx.deliveryOrder.update({
        where: { id: deliveryOrder.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date()
        }
      });

      // 2. Actualizar orden principal
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' }
      });

      // 3. Actualizar estadísticas del repartidor
      await tx.deliveryPerson.update({
        where: { id: actualDeliveryPersonId },
        data: {
          completedOrders: { increment: 1 },
          totalDeliveries: { increment: 1 },
          isAvailable: true // Liberar al repartidor
        }
      });
      
      return updated;
    });

    return res.json({
      success: true,
      deliveryOrder: updatedDelivery
    });
  } catch (error) {
    next(error);
  }
};

export const createDeliveryRatingPublic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = ratingSchema.safeParse(req.body);

    if (!result.success) {
      throw new AppError('Datos inválidos', 400);
    }

    const { orderId, rating, comment, deliveryPersonId } = result.data;

    // Verificar si existe la orden de entrega y obtener el cliente
    const deliveryOrder = await prisma.deliveryOrder.findFirst({
      where: { orderId },
      include: { order: true }
    });

    if (!deliveryOrder) {
      throw new AppError('Orden de entrega no encontrada', 404);
    }

    // Verificar si ya existe calificación
    const existingRating = await prisma.deliveryRating.findUnique({
      where: { deliveryOrderId: deliveryOrder.id }
    });

    if (existingRating) {
      throw new AppError('Esta orden ya fue calificada', 400);
    }

    // Crear calificación y actualizar promedio
    await prisma.$transaction(async (tx) => {
      // 1. Crear rating
      await tx.deliveryRating.create({
        data: {
          deliveryOrderId: deliveryOrder.id,
          deliveryPersonId,
          customerId: deliveryOrder.order.customerId,
          rating,
          comment
        }
      });

      // 2. Recalcular promedio del repartidor
      // Primero obtenemos todas las calificaciones
      const ratings = await tx.deliveryRating.findMany({
        where: { deliveryPersonId },
        select: { rating: true }
      });

      const totalRating = ratings.reduce((sum, r) => sum + Number(r.rating), 0);
      const newAverage = totalRating / ratings.length;

      // Actualizar repartidor
      await tx.deliveryPerson.update({
        where: { id: deliveryPersonId },
        data: {
          rating: newAverage
        }
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Calificación enviada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
