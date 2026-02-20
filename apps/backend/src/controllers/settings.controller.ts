import { Request, Response, NextFunction } from 'express';
import prisma, { BusinessType, PersonaType, ISLRRegimen } from '@ventasve/database';
import { AppError } from '../lib/errors';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const BusinessFiscalSchema = z.object({
  rif: z
    .string()
    .regex(/^[JVE]-\d{8,9}-\d$/, 'Formato RIF inválido. Debe ser: J-12345678-9')
    .optional(),
  fiscalAddress: z
    .string()
    .min(10, 'Dirección fiscal muy corta')
    .max(500, 'Dirección fiscal muy larga')
    .optional(),
  businessAddress: z
    .string()
    .min(10, 'Dirección del negocio muy corta')
    .max(500, 'Dirección del negocio muy larga')
    .optional(),
  ownerName: z
    .string()
    .regex(/^[a-zA-ZáéíóúñÑ\s]+$/, 'Solo letras y espacios')
    .min(3, 'Nombre completo requerido')
    .optional(),
  ownerPhone: z
    .string()
    .regex(/^\+58 \d{3}-\d{7}$/, 'Formato: +58 XXX-XXXXXXX')
    .optional(),
  ownerEmail: z
    .string()
    .email('Email inválido')
    .optional(),
  personaType: z.nativeEnum(PersonaType).optional(),
  estadoId: z.number().int().positive().optional(),
  municipioId: z.number().int().positive().optional(),
  parroquiaId: z.number().int().positive().optional(),
  postalCode: z
    .string()
    .regex(/^\d{4}(?:-\w{1})?$/, 'Formato: 1010 o 1010-A')
    .optional(),
  electronicInvoicing: z
    .boolean()
    .default(false)
    .optional(),
  islrRegimen: z.nativeEnum(ISLRRegimen).optional(),
  razonSocial: z.string().optional()
});

const businessSettingsSchema = z
  .object({
    name: z.string().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    whatsappPhone: z.string().optional(),
    city: z.string().optional(),
    instagram: z.string().optional(),
    schedule: z.string().optional(),
    description: z.string().optional(),
    businessType: z.nativeEnum(BusinessType).optional(),
    cashUsdExchangeRate: z.number().optional(),
    businessProfile: z
      .enum(['TIENDA_FISICA', 'TIENDA_ONLINE', 'EMPRENDEDOR', 'PROFESIONAL'])
      .optional(),
    paymentMethods: z.record(z.any()).optional(),
    catalogOptions: z.record(z.boolean()).optional(),
    notificationSettings: z.record(z.record(z.boolean())).optional()
  })
  .merge(BusinessFiscalSchema);

const validateBusinessFiscal = (data: any) => {
  if (data.personaType === 'JURIDICA') {
    if (!data.rif) {
      throw new Error('RIF es obligatorio para persona jurídica');
    }
    if (!data.razonSocial) {
      throw new Error('Razón social es obligatoria para persona jurídica');
    }
  }
  if (data.personaType === 'NATURAL') {
    if (data.rif && !data.rif.startsWith('V-')) {
      throw new Error('Para persona natural, el RIF debe comenzar con V-');
    }
  }
};

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
      include: {
        estadoRel: true,
        municipioRel: true,
        parroquiaRel: true,
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    res.json({
      name: business.name,
      slug: business.slug,
      businessType: business.type,
      whatsappPhone: business.whatsapp,
      city: business.city,
      instagram: business.instagram,
      schedule: business.schedule,
      description: business.description,
      ownerName: business.ownerName ?? (business.settings as any)?.ownerName,
      ownerPhone: business.ownerPhone ?? (business.settings as any)?.ownerPhone,
      ownerEmail: business.ownerEmail ?? (business.settings as any)?.ownerEmail,
      businessAddress: business.businessAddress ?? (business.settings as any)?.businessAddress,
      personaType: business.personaType ?? (business.settings as any)?.personaType,
      rif: business.rif ?? (business.settings as any)?.rif,
      razonSocial: business.razonSocial ?? (business.settings as any)?.razonSocial,
      fiscalAddress: business.fiscalAddress ?? (business.settings as any)?.fiscalAddress,
      estadoId: business.estadoId ?? (business.settings as any)?.estadoId,
      municipioId: business.municipioId ?? (business.settings as any)?.municipioId,
      parroquiaId: business.parroquiaId ?? (business.settings as any)?.parroquiaId,
      estado: (business as any).estadoRel
        ? {
            id: (business as any).estadoRel.id,
            codigo: (business as any).estadoRel.codigo,
            nombre_estado: (business as any).estadoRel.nombreEstado,
          }
        : null,
      municipio: (business as any).municipioRel
        ? {
            id: (business as any).municipioRel.id,
            estado_id: (business as any).municipioRel.estadoId,
            nombre_municipio: (business as any).municipioRel.nombreMunicipio,
            codigo: (business as any).municipioRel.codigo,
          }
        : null,
      parroquia: (business as any).parroquiaRel
        ? {
            id: (business as any).parroquiaRel.id,
            municipio_id: (business as any).parroquiaRel.municipioId,
            nombre_parroquia: (business as any).parroquiaRel.nombreParroquia,
            codigo: (business as any).parroquiaRel.codigo,
          }
        : null,
      postalCode: business.postalCode ?? (business.settings as any)?.postalCode,
      electronicInvoicing: business.electronicInvoicing ?? (business.settings as any)?.electronicInvoicing,
      islrRegimen: business.islrRegimen ?? (business.settings as any)?.islrRegimen,
      businessProfile: (business.settings as any)?.businessProfile,
      cashUsdExchangeRate: (business.settings as any)?.cashUsdExchangeRate,
      paymentMethods: business.paymentMethods ?? {},
      catalogOptions: business.catalogOptions ?? {},
      notificationSettings: business.notificationSettings ?? {}
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

    validateBusinessFiscal(data);

    const updateData: any = {};

    const existingGeo = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        estadoId: true,
        municipioId: true,
        parroquiaId: true
      }
    });

    const targetEstadoId = data.estadoId ?? existingGeo?.estadoId ?? null;
    const targetMunicipioId = data.municipioId ?? existingGeo?.municipioId ?? null;
    const targetParroquiaId = data.parroquiaId ?? existingGeo?.parroquiaId ?? null;

    if (targetEstadoId !== null) {
      const estado = await prisma.estado.findUnique({ where: { id: targetEstadoId } });
      if (!estado) {
        throw new AppError('Estado inválido', 400, 'INVALID_ESTADO', 'estadoId');
      }
    }

    if (targetMunicipioId !== null) {
      const municipio = await prisma.municipio.findUnique({ where: { id: targetMunicipioId } });
      if (!municipio) {
        throw new AppError('Municipio inválido', 400, 'INVALID_MUNICIPIO', 'municipioId');
      }
      if (targetEstadoId !== null && municipio.estadoId !== targetEstadoId) {
        throw new AppError('El municipio no pertenece al estado seleccionado', 400, 'MUNICIPIO_ESTADO_MISMATCH', 'municipioId');
      }
    }

    if (targetParroquiaId !== null) {
      const parroquia = await prisma.parroquia.findUnique({ where: { id: targetParroquiaId } });
      if (!parroquia) {
        throw new AppError('Parroquia inválida', 400, 'INVALID_PARROQUIA', 'parroquiaId');
      }
      if (targetMunicipioId !== null && parroquia.municipioId !== targetMunicipioId) {
        throw new AppError('La parroquia no pertenece al municipio seleccionado', 400, 'PARROQUIA_MUNICIPIO_MISMATCH', 'parroquiaId');
      }
    }

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.whatsappPhone !== undefined) updateData.whatsapp = normalizeWhatsapp(data.whatsappPhone);
    if (data.city !== undefined) updateData.city = data.city;
    if (data.instagram !== undefined) updateData.instagram = data.instagram;
    if (data.schedule !== undefined) updateData.schedule = data.schedule;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.paymentMethods !== undefined) updateData.paymentMethods = data.paymentMethods;
    if (data.catalogOptions !== undefined) updateData.catalogOptions = data.catalogOptions;
    if (data.notificationSettings !== undefined) updateData.notificationSettings = data.notificationSettings;
    if (data.businessType !== undefined) updateData.type = data.businessType;
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName;
    if (data.ownerPhone !== undefined) updateData.ownerPhone = data.ownerPhone;
    if (data.ownerEmail !== undefined) updateData.ownerEmail = data.ownerEmail;
    if (data.businessAddress !== undefined) updateData.businessAddress = data.businessAddress;
    if (data.personaType !== undefined) updateData.personaType = data.personaType;
    if (data.rif !== undefined) updateData.rif = data.rif;
    if (data.razonSocial !== undefined) updateData.razonSocial = data.razonSocial;
    if (data.fiscalAddress !== undefined) updateData.fiscalAddress = data.fiscalAddress;
    if (data.estadoId !== undefined) updateData.estadoId = data.estadoId;
    if (data.municipioId !== undefined) updateData.municipioId = data.municipioId;
    if (data.parroquiaId !== undefined) updateData.parroquiaId = data.parroquiaId;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.electronicInvoicing !== undefined) updateData.electronicInvoicing = data.electronicInvoicing;
    if (data.islrRegimen !== undefined) updateData.islrRegimen = data.islrRegimen;

    if (data.cashUsdExchangeRate !== undefined || data.businessProfile !== undefined) {
      const existing = await prisma.business.findUnique({
        where: { id: businessId },
        select: { settings: true }
      });

      const currentSettings = (existing?.settings as any) || {};
      const newSettings: any = { ...currentSettings };

      if (data.cashUsdExchangeRate !== undefined) {
        newSettings.cashUsdExchangeRate = data.cashUsdExchangeRate;
      }
      if (data.businessProfile !== undefined) {
        newSettings.businessProfile = data.businessProfile;
      }
      updateData.settings = newSettings;
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: updateData,
      select: {
        name: true,
        slug: true,
        type: true,
        whatsapp: true,
        city: true,
        instagram: true,
        schedule: true,
        description: true,
        ownerName: true,
        ownerPhone: true,
        ownerEmail: true,
        businessAddress: true,
        personaType: true,
        rif: true,
        razonSocial: true,
        fiscalAddress: true,
        state: true,
        municipio: true,
        parroquia: true,
        postalCode: true,
        electronicInvoicing: true,
        islrRegimen: true,
        settings: true,
        paymentMethods: true,
        catalogOptions: true,
        notificationSettings: true
      }
    });

    res.json({
      name: updated.name,
      slug: updated.slug,
      businessType: updated.type,
      whatsappPhone: updated.whatsapp,
      city: updated.city,
      instagram: updated.instagram,
      schedule: updated.schedule,
      description: updated.description,
      ownerName: updated.ownerName ?? (updated.settings as any)?.ownerName,
      ownerPhone: updated.ownerPhone ?? (updated.settings as any)?.ownerPhone,
      ownerEmail: updated.ownerEmail ?? (updated.settings as any)?.ownerEmail,
      businessAddress: updated.businessAddress ?? (updated.settings as any)?.businessAddress,
      personaType: updated.personaType ?? (updated.settings as any)?.personaType,
      rif: updated.rif ?? (updated.settings as any)?.rif,
      razonSocial: updated.razonSocial ?? (updated.settings as any)?.razonSocial,
      fiscalAddress: updated.fiscalAddress ?? (updated.settings as any)?.fiscalAddress,
      state: updated.state ?? (updated.settings as any)?.state,
      municipio: updated.municipio ?? (updated.settings as any)?.municipio,
      parroquia: updated.parroquia ?? (updated.settings as any)?.parroquia,
      postalCode: updated.postalCode ?? (updated.settings as any)?.postalCode,
      electronicInvoicing: updated.electronicInvoicing ?? (updated.settings as any)?.electronicInvoicing,
      islrRegimen: updated.islrRegimen ?? (updated.settings as any)?.islrRegimen,
      businessProfile: (updated.settings as any)?.businessProfile,
      cashUsdExchangeRate: (updated.settings as any)?.cashUsdExchangeRate,
      paymentMethods: updated.paymentMethods ?? {},
      catalogOptions: updated.catalogOptions ?? {},
      notificationSettings: updated.notificationSettings ?? {}
    });
  } catch (error) {
    next(error);
  }
};
