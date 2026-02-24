import { Request, Response, NextFunction } from 'express';
import prisma, { BusinessType } from '@ventasve/database';
import { AppError } from '../lib/errors';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logoUpload, imageUploadService } from '../services/image-upload.service';
import { authed } from '../lib/handler';

type BusinessShippingZone = {
  id: string;
  slug: string;
  name: string;
  price: number;
  free: boolean;
  distanceKm?: number;
  deliveryTime?: string;
};

type BusinessShippingOptions = {
  freeShippingEnabled?: boolean;
  freeShippingMin?: number;
  pickupEnabled?: boolean;
};

type BusinessSettings = {
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  businessAddress?: string;
  personaType?: 'NATURAL' | 'JURIDICA';
  rif?: string;
  razonSocial?: string;
  fiscalAddress?: string;
  estadoId?: number;
  municipioId?: number;
  parroquiaId?: number;
  postalCode?: string;
  electronicInvoicing?: boolean;
  islrRegimen?: string;
  businessProfile?: 'TIENDA_FISICA' | 'TIENDA_ONLINE' | 'EMPRENDEDOR' | 'PROFESIONAL';
  cashUsdExchangeRate?: number;
  notificationSettings?: Record<string, Record<string, boolean>>;
  logoUrl?: string;
  shippingZones?: BusinessShippingZone[];
  shippingOptions?: BusinessShippingOptions;
};

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
    .regex(/^\+\d{1,3}(?:[ -]?\d){6,14}$/, 'Incluye código de país, ej: +58 412-1234567')
    .optional(),
  ownerEmail: z
    .string()
    .email('Email inválido')
    .optional(),
  personaType: z
    .enum(['NATURAL', 'JURIDICA'])
    .optional(),
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
  islrRegimen: z
    .string()
    .optional(),
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
    paymentMethods: z.object({
      zelle: z.object({
        email: z.string().email('Correo de Zelle inválido. Ejemplo: usuario@correo.com').optional(),
        name: z.string().optional()
      }).optional(),
      pagoMovil: z.object({
        phone: z.string().optional(),
        bank: z.string().optional(),
        id: z.string().optional()
      }).optional(),
      binance: z.object({
        id: z.string().optional()
      }).optional(),
      transfer: z.object({
        account: z.string().optional(),
        name: z.string().optional()
      }).optional()
    }).optional(),
    catalogOptions: z.object({
      showBs: z.boolean().optional(),
      showStock: z.boolean().optional(),
      showChatButton: z.boolean().optional(),
      allowOrdersWithoutStock: z.boolean().optional(),
      showSearch: z.boolean().optional(),
      showStrikePrice: z.boolean().optional(),
      minOrderAmount: z.number().optional(),
      maxOrderAmount: z.number().optional(),
    }).optional(),
    notificationSettings: z.record(z.record(z.boolean())).optional(),
    shippingZones: z.array(z.object({
      id: z.string(),
      slug: z.string().max(50),
      name: z.string().min(1),
      price: z.number().nonnegative(),
      free: z.boolean(),
      distanceKm: z.number().positive().optional(),
      deliveryTime: z.string().max(50).optional()
    })).optional(),
    shippingOptions: z.object({
      freeShippingEnabled: z.boolean().optional(),
      freeShippingMin: z.number().optional(),
      pickupEnabled: z.boolean().optional()
    }).optional()
  })
  .merge(BusinessFiscalSchema);

const validateBusinessFiscal = (data: z.infer<typeof businessSettingsSchema>) => {
  if (data.personaType === 'JURIDICA') {
    if (!data.rif) {
      throw new AppError('RIF es obligatorio para persona jurídica', 422, 'VALIDATION_ERROR', 'rif');
    }
    if (!data.razonSocial) {
      throw new AppError('Razón social es obligatoria para persona jurídica', 422, 'VALIDATION_ERROR', 'razonSocial');
    }
  }
  if (data.personaType === 'NATURAL') {
    if (data.rif && !data.rif.startsWith('V-')) {
      throw new AppError('Para persona natural, el RIF debe comenzar con V-', 422, 'VALIDATION_ERROR', 'rif');
    }
  }
};

const normalizeWhatsapp = (value: string) => {
  const digits = value.replace(/\D/g, '');
  const trimmed = value.trim();
  if (!digits) return trimmed;
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.startsWith('58')) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+58${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+58${digits}`;
  }
  return `+${digits}`;
};

function formatBusinessResponse(business: {
  name: string;
  slug: string;
  type: BusinessType;
  whatsapp: string | null;
  city: string | null;
  instagram: string | null;
  schedule: string | null;
  description: string | null;
  settings: unknown;
  paymentMethods: unknown;
  catalogOptions: unknown;
}) {
  const s = business.settings as BusinessSettings | null;
  return {
    name: business.name,
    slug: business.slug,
    businessType: business.type,
    whatsappPhone: business.whatsapp,
    city: business.city,
    instagram: business.instagram,
    schedule: business.schedule,
    description: business.description,
    logoUrl: s?.logoUrl,
    ownerName: s?.ownerName,
    ownerPhone: s?.ownerPhone,
    ownerEmail: s?.ownerEmail,
    businessAddress: s?.businessAddress,
    personaType: s?.personaType,
    rif: s?.rif,
    razonSocial: s?.razonSocial,
    fiscalAddress: s?.fiscalAddress,
    estadoId: s?.estadoId,
    municipioId: s?.municipioId,
    parroquiaId: s?.parroquiaId,
    postalCode: s?.postalCode,
    electronicInvoicing: s?.electronicInvoicing,
    islrRegimen: s?.islrRegimen,
    businessProfile: s?.businessProfile,
    cashUsdExchangeRate: s?.cashUsdExchangeRate,
    paymentMethods: business.paymentMethods ?? {},
    catalogOptions: business.catalogOptions ?? {},
    notificationSettings: s?.notificationSettings ?? {},
    shippingZones: s?.shippingZones ?? [],
    shippingOptions: s?.shippingOptions ?? {}
  };
}

export const getSettings = authed(async ({ businessId }) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw new AppError('Negocio no encontrado', 404, 'NOT_FOUND');
  }

  return formatBusinessResponse(business);
});

export const updateSettings = authed(async ({ businessId, body, req }) => {
  const requestId = (req as unknown as Record<string, unknown>).requestId;

  if (process.env.NODE_ENV === 'development') {
    console.log('[updateSettings][INPUT]', requestId, JSON.stringify(body));
  }
  const data = businessSettingsSchema.parse(body);

  validateBusinessFiscal(data);

  const updateData: Record<string, unknown> = {};

  const existing = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true }
  });
  const currentSettings = (existing?.settings as BusinessSettings | null) || {};

  if (data.slug) {
    const slugTaken = await prisma.business.findFirst({
      where: {
        slug: data.slug,
        NOT: { id: businessId }
      },
      select: { id: true }
    });
    if (slugTaken) {
      throw new AppError('Este slug ya está en uso', 400, 'SLUG_TAKEN', 'slug');
    }
  }

  const currentEstadoId = currentSettings?.estadoId ?? null;
  const currentMunicipioId = currentSettings?.municipioId ?? null;
  const currentParroquiaId = currentSettings?.parroquiaId ?? null;

  const targetEstadoId = data.estadoId ?? currentEstadoId ?? null;
  const targetMunicipioId = data.municipioId ?? currentMunicipioId ?? null;
  const targetParroquiaId = data.parroquiaId ?? currentParroquiaId ?? null;

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
  if (data.businessType !== undefined) updateData.type = data.businessType;

  const newSettings: Record<string, unknown> = { ...currentSettings };
  if (data.ownerName !== undefined) newSettings.ownerName = data.ownerName;
  if (data.ownerPhone !== undefined) newSettings.ownerPhone = data.ownerPhone;
  if (data.ownerEmail !== undefined) newSettings.ownerEmail = data.ownerEmail;
  if (data.businessAddress !== undefined) newSettings.businessAddress = data.businessAddress;
  if (data.personaType !== undefined) newSettings.personaType = data.personaType;
  if (data.rif !== undefined) newSettings.rif = data.rif;
  if (data.razonSocial !== undefined) newSettings.razonSocial = data.razonSocial;
  if (data.fiscalAddress !== undefined) newSettings.fiscalAddress = data.fiscalAddress;
  if (data.estadoId !== undefined) newSettings.estadoId = data.estadoId;
  if (data.municipioId !== undefined) newSettings.municipioId = data.municipioId;
  if (data.parroquiaId !== undefined) newSettings.parroquiaId = data.parroquiaId;
  if (data.postalCode !== undefined) newSettings.postalCode = data.postalCode;
  if (data.electronicInvoicing !== undefined) newSettings.electronicInvoicing = data.electronicInvoicing;
  if (data.islrRegimen !== undefined) newSettings.islrRegimen = data.islrRegimen;
  if (data.cashUsdExchangeRate !== undefined) newSettings.cashUsdExchangeRate = data.cashUsdExchangeRate;
  if (data.businessProfile !== undefined) newSettings.businessProfile = data.businessProfile;
  if (data.notificationSettings !== undefined) newSettings.notificationSettings = data.notificationSettings;
  if (data.shippingZones !== undefined) newSettings.shippingZones = data.shippingZones as BusinessShippingZone[];
  if (data.shippingOptions !== undefined) newSettings.shippingOptions = data.shippingOptions as BusinessShippingOptions;
  updateData.settings = newSettings;

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
      settings: true,
      paymentMethods: true,
      catalogOptions: true
    }
  });

  const responsePayload = formatBusinessResponse(updated);

  if (process.env.NODE_ENV === 'development') {
    console.log('[updateSettings][OUTPUT]', requestId, JSON.stringify(responsePayload));
  }

  return responsePayload;
});

// uploadLogo keeps raw req/res because of multer middleware
export const uploadLogo = [
  logoUpload.single('logo'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (!user || !user.businessId) {
        return res.status(401).json({
          error: 'Not authenticated',
          code: 'SETTINGS_NOT_AUTHENTICATED'
        });
      }
      if (!req.file) {
        return res.status(400).json({
          error: 'No se proporcionó el archivo de logo',
          code: 'LOGO_FILE_REQUIRED'
        });
      }

      const logoUrl = await imageUploadService.uploadBusinessLogo(req.file);

      const existing = await prisma.business.findUnique({
        where: { id: user.businessId },
        select: { settings: true }
      });
      const currentSettings = (existing?.settings as BusinessSettings | null) || {};
      const newSettings = {
        ...currentSettings,
        logoUrl
      };

      await prisma.business.update({
        where: { id: user.businessId },
        data: {
          settings: newSettings
        }
      });

      return res.json({ logoUrl });
    } catch (error) {
      next(error);
    }
  }
];
