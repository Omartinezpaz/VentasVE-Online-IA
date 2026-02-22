import { Request, Response, NextFunction } from 'express';
import prisma from '@ventasve/database';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { ShippingZoneCoverageInput } from '../types/shipping';
import crypto from 'crypto';

const coverageSchema = z.object({
  estadoId: z.number().int().positive(),
  municipioId: z.number().int().positive().nullable().optional(),
  parroquiaId: z.number().int().positive().nullable().optional(),
  zoneId: z.string().uuid().optional()
});

const createShippingZoneSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  free: z.boolean().optional().default(false),
  freeOver: z.number().nonnegative().nullable().optional(),
  radius: z.number().int().positive().nullable().optional(),
  deliveryTime: z.string().max(50).nullable().optional(),
  coverages: z.array(coverageSchema).optional().default([])
});

const updateShippingZoneSchema = createShippingZoneSchema.partial();

export const validateCoverage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res
        .status(401)
        .json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }
    const businessId = user.businessId;

    const { estadoId, municipioId, parroquiaId, zoneId } = coverageSchema.parse(
      req.body
    );

    const existingCoverages = await prisma.shippingZoneCoverage.findMany({
      where: {
        zone: {
          businessId,
          ...(zoneId ? { NOT: { id: zoneId } } : {})
        }
      },
      include: {
        zone: true
      }
    });

    const findConflict = () => {
      for (const cov of existingCoverages) {
        if (parroquiaId != null) {
          if (cov.parroquiaId === parroquiaId) return cov;
          if (
            cov.parroquiaId == null &&
            cov.municipioId === municipioId &&
            municipioId != null
          ) {
            return cov;
          }
          if (
            cov.parroquiaId == null &&
            cov.municipioId == null &&
            cov.estadoId === estadoId
          ) {
            return cov;
          }
        } else if (municipioId != null) {
          if (cov.parroquiaId != null && cov.municipioId === municipioId) {
            return cov;
          }
          if (
            cov.parroquiaId == null &&
            cov.municipioId === municipioId
          ) {
            return cov;
          }
          if (
            cov.parroquiaId == null &&
            cov.municipioId == null &&
            cov.estadoId === estadoId
          ) {
            return cov;
          }
        } else {
          if (cov.estadoId === estadoId) {
            return cov;
          }
        }
      }
      return null;
    };

    const conflict = findConflict();

    if (!conflict) {
      return res.json({ valid: true, message: 'Cobertura válida' });
    }

    const zoneName = conflict.zone.name;
    let locationLabel = `estado ${estadoId}`;
    if (parroquiaId != null && municipioId != null) {
      locationLabel = `parroquia ${parroquiaId}`;
    } else if (municipioId != null) {
      locationLabel = `municipio ${municipioId}`;
    }

    return res.json({
      valid: false,
      message: `Esta cobertura ya está asignada a la zona "${zoneName}" (${locationLabel})`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'VALIDATION_FAILED',
        details: error.errors
      });
    }
    next(error);
  }
};

export const getShippingZones = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }
    const businessId = user.businessId;

    const zones = await prisma.shippingZone.findMany({
      where: { businessId },
      include: {
        coverages: {
          include: {
            estado: true,
            municipio: true,
            parroquia: true
          }
        },
        rates: {
          include: {
            method: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const formatted = zones.map(zone => ({
      id: zone.id,
      businessId: zone.businessId,
      name: zone.name,
      price: Number(zone.price),
      free: zone.free,
      freeOver: zone.freeOver ? Number(zone.freeOver) : null,
      radius: zone.radius,
      deliveryTime: zone.deliveryTime,
      isActive: zone.isActive,
      coverages: zone.coverages.map(cov => ({
        id: cov.id,
        estadoId: cov.estadoId,
        estadoNombre: cov.estado.nombreEstado,
        municipioId: cov.municipioId ?? null,
        municipioNombre: cov.municipio ? cov.municipio.nombreMunicipio : null,
        parroquiaId: cov.parroquiaId ?? null,
        parroquiaNombre: cov.parroquia ? cov.parroquia.nombreParroquia : null
      })),
      rates: zone.rates.map(rate => ({
        methodId: rate.methodId,
        methodCode: rate.method.code,
        methodName: rate.method.name,
        icon: rate.method.icon,
        costType: rate.costType,
        costValue: Number(rate.costValue),
        minOrderAmount: Number(rate.minOrderAmount),
        isFree: rate.isFree
      }))
    }));

    return res.json({
      zones: formatted,
      count: formatted.length
    });
  } catch (error) {
    next(error);
  }
};

export const createShippingZone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }
    const businessId = user.businessId;

    const data = createShippingZoneSchema.parse(req.body);

    const zoneId = crypto.randomUUID();

    const result = await prisma.$transaction(async tx => {
      const zone = await tx.shippingZone.create({
        data: {
          id: zoneId,
          businessId,
          name: data.name,
          price: data.price,
          free: data.free ?? false,
          freeOver: data.freeOver ?? null,
          radius: data.radius ?? null,
          deliveryTime: data.deliveryTime ?? null,
          isActive: true
        }
      });

      const coverages: ShippingZoneCoverageInput[] = data.coverages ?? [];

      if (coverages.length > 0) {
        await tx.shippingZoneCoverage.createMany({
          data: coverages.map(cov => ({
            id: crypto.randomUUID(),
            zoneId: zone.id,
            estadoId: cov.estadoId,
            municipioId: cov.municipioId ?? null,
            parroquiaId: cov.parroquiaId ?? null
          }))
        });
      }

      const method = await tx.shippingMethod.findFirst({
        where: { code: 'DELIVERY_PROPIO' }
      });

      if (method) {
        await tx.shippingRate.create({
          data: {
            id: crypto.randomUUID(),
            zoneId: zone.id,
            methodId: method.id,
            costType: 'fixed',
            costValue: data.price,
            minOrderAmount: 0,
            isFree: data.free ?? false,
            isActive: true
          }
        });
      }

      return tx.shippingZone.findUnique({
        where: { id: zone.id },
        include: {
          coverages: true,
          rates: {
            include: { method: true }
          }
        }
      });
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'VALIDATION_FAILED',
        details: error.errors
      });
    }
    next(error);
  }
};

export const updateShippingZone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }
    const businessId = user.businessId;
    const zoneId = req.params.id;

    const data = updateShippingZoneSchema.parse(req.body);

    const updated = await prisma.$transaction(async tx => {
      const existing = await tx.shippingZone.findFirst({
        where: { id: zoneId, businessId }
      });
      if (!existing) {
        return null;
      }

      const zone = await tx.shippingZone.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? undefined,
          price: data.price ?? undefined,
          free: data.free ?? undefined,
          freeOver: data.freeOver ?? undefined,
          radius: data.radius ?? undefined,
          deliveryTime: data.deliveryTime ?? undefined
        }
      });

      if (data.coverages !== undefined) {
        await tx.shippingZoneCoverage.deleteMany({
          where: { zoneId: zone.id }
        });

        const coverages: ShippingZoneCoverageInput[] = data.coverages ?? [];

        if (coverages.length > 0) {
          await tx.shippingZoneCoverage.createMany({
            data: coverages.map(cov => ({
              id: crypto.randomUUID(),
              zoneId: zone.id,
              estadoId: cov.estadoId,
              municipioId: cov.municipioId ?? null,
              parroquiaId: cov.parroquiaId ?? null
            }))
          });
        }
      }

      if (data.price !== undefined || data.free !== undefined) {
        const method = await tx.shippingMethod.findFirst({
          where: { code: 'DELIVERY_PROPIO' }
        });
        if (method) {
          await tx.shippingRate.updateMany({
            where: {
              zoneId: zone.id,
              methodId: method.id
            },
            data: {
              costValue: data.price !== undefined ? data.price : undefined,
              isFree: data.free !== undefined ? data.free : undefined
            }
          });
        }
      }

      return tx.shippingZone.findUnique({
        where: { id: zone.id },
        include: {
          coverages: true,
          rates: {
            include: { method: true }
          }
        }
      });
    });

    if (!updated) {
      return res.status(404).json({
        error: 'Zona de envío no encontrada',
        code: 'SHIPPING_ZONE_NOT_FOUND'
      });
    }

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'VALIDATION_FAILED',
        details: error.errors
      });
    }
    next(error);
  }
};

export const deleteShippingZone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || !user.businessId) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }
    const businessId = user.businessId;
    const zoneId = req.params.id;

    const deleted = await prisma.shippingZone.deleteMany({
      where: { id: zoneId, businessId }
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        error: 'Zona de envío no encontrada',
        code: 'SHIPPING_ZONE_NOT_FOUND'
      });
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
