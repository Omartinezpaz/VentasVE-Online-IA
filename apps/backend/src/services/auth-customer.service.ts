import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@ventasve/database';
import { env } from '../lib/env';
import { Errors } from '../lib/errors';

const SALT_ROUNDS = env.BCRYPT_ROUNDS || 12;

type CustomerJwtPayload = {
  sub: string;
  email: string;
  businessId: string;
  profileType: string;
};

type RegisterCustomerInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessId: string;
};

type LoginCustomerInput = {
  email: string;
  password: string;
  businessId: string;
};

type SwitchBusinessInput = {
  customerId: string;
  targetBusinessId: string;
};

const normalizePhone = (value: string) => {
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

export class AuthCustomerService {
  private generateToken(payload: CustomerJwtPayload) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });
  }

  private sanitizeCustomer(customer: any) {
    const { passwordHash, ...rest } = customer;
    return rest;
  }

  private async findOrCreateProfile(customerId: string, businessId: string) {
    const existing = await prisma.customerBusinessProfile.findUnique({
      where: {
        customerId_businessId: {
          customerId,
          businessId
        }
      }
    });

    if (existing) {
      const updated = await prisma.customerBusinessProfile.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() }
      });
      return updated;
    }

    const profile = await prisma.customerBusinessProfile.create({
      data: {
        customerId,
        businessId,
        type: 'REGISTERED'
      }
    });

    return profile;
  }

  async register(data: RegisterCustomerInput) {
    const business = await prisma.business.findUnique({
      where: { id: data.businessId }
    });

    if (!business || !business.isActive) {
      throw Errors.Validation('Negocio no disponible', 'businessId');
    }

    const existingByEmail = await prisma.customer.findFirst({
      where: {
        email: data.email
      }
    });

    if (existingByEmail && existingByEmail.passwordHash) {
      throw Errors.Conflict('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    let customer = existingByEmail;

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone ? normalizePhone(data.phone) : null,
          passwordHash,
          isActive: true,
          isVerified: false
        }
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: data.name ?? customer.name,
          phone: data.phone ? normalizePhone(data.phone) : customer.phone,
          passwordHash
        }
      });
    }

    const profile = await this.findOrCreateProfile(customer.id, data.businessId);

    if (profile.isBlocked) {
      throw Errors.Unauthorized();
    }

    const token = this.generateToken({
      sub: customer.id,
      email: customer.email || '',
      businessId: data.businessId,
      profileType: profile.type
    });

    return {
      customer: this.sanitizeCustomer(customer),
      profile,
      accessToken: token
    };
  }

  async login(data: LoginCustomerInput) {
    const customer = await prisma.customer.findFirst({
      where: {
        email: data.email
      }
    });

    if (!customer || !customer.passwordHash) {
      throw Errors.Unauthorized();
    }

    const isValid = await bcrypt.compare(data.password, customer.passwordHash);
    if (!isValid) {
      throw Errors.Unauthorized();
    }

    if (!customer.isActive) {
      throw Errors.Unauthorized();
    }

    const business = await prisma.business.findUnique({
      where: { id: data.businessId }
    });

    if (!business || !business.isActive) {
      throw Errors.Validation('Negocio no disponible', 'businessId');
    }

    const profile = await this.findOrCreateProfile(customer.id, data.businessId);

    if (profile.isBlocked) {
      throw Errors.Unauthorized();
    }

    const token = this.generateToken({
      sub: customer.id,
      email: customer.email || '',
      businessId: data.businessId,
      profileType: profile.type
    });

    return {
      customer: this.sanitizeCustomer(customer),
      profile,
      accessToken: token
    };
  }

  async switchBusiness(data: SwitchBusinessInput) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId }
    });

    if (!customer || !customer.isActive) {
      throw Errors.Unauthorized();
    }

    const business = await prisma.business.findUnique({
      where: { id: data.targetBusinessId }
    });

    if (!business || !business.isActive) {
      throw Errors.Validation('Negocio no disponible', 'targetBusinessId');
    }

    const profile = await this.findOrCreateProfile(customer.id, data.targetBusinessId);

    if (profile.isBlocked) {
      throw Errors.Unauthorized();
    }

    const token = this.generateToken({
      sub: customer.id,
      email: customer.email || '',
      businessId: data.targetBusinessId,
      profileType: profile.type
    });

    return {
      profile,
      accessToken: token
    };
  }
}

export const authCustomerService = new AuthCustomerService();

