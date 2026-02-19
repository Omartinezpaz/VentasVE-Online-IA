import { Request, Response, NextFunction } from 'express';
import prisma from '@ventasve/database';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const businessSettingsSchema = z.object({
  name: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  whatsappPhone: z.string().optional(),
  city: z.string().optional(),
  instagram: z.string().optional(),
  schedule: z.string().optional(),
  description: z.string().optional(),
  paymentMethods: z.record(z.any()).optional(),
  catalogOptions: z.record(z.boolean()).optional()
});

const normalizeWhatsapp = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return value.trim();
  if (digits.startsWith('58')) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+58${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+58${digits}`;
  }
  return value.trim();
};

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        slug: true,
        whatsapp: true,
        city: true,
        instagram: true,
        schedule: true,
        description: true,
        paymentMethods: true,
        catalogOptions: true
      }
    });

    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    res.json({
      name: business.name,
      slug: business.slug,
      whatsappPhone: business.whatsapp,
      city: business.city,
      instagram: business.instagram,
      schedule: business.schedule,
      description: business.description,
      paymentMethods: business.paymentMethods ?? {},
      catalogOptions: business.catalogOptions ?? {}
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const data = businessSettingsSchema.parse(req.body);

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.whatsappPhone !== undefined) updateData.whatsapp = normalizeWhatsapp(data.whatsappPhone);
    if (data.city !== undefined) updateData.city = data.city;
    if (data.instagram !== undefined) updateData.instagram = data.instagram;
    if (data.schedule !== undefined) updateData.schedule = data.schedule;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.paymentMethods !== undefined) updateData.paymentMethods = data.paymentMethods;
    if (data.catalogOptions !== undefined) updateData.catalogOptions = data.catalogOptions;

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: updateData,
      select: {
        name: true,
        slug: true,
        whatsapp: true,
        city: true,
        instagram: true,
        schedule: true,
        description: true,
        paymentMethods: true,
        catalogOptions: true
      }
    });

    res.json({
      name: updated.name,
      slug: updated.slug,
      whatsappPhone: updated.whatsapp,
      city: updated.city,
      instagram: updated.instagram,
      schedule: updated.schedule,
      description: updated.description,
      paymentMethods: updated.paymentMethods ?? {},
      catalogOptions: updated.catalogOptions ?? {}
    });
  } catch (error) {
    next(error);
  }
};
