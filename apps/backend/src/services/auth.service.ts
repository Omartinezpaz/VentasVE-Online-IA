import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma, { Role, Prisma } from '@ventasve/database';
import { env } from '../lib/env';
import { Errors } from '../lib/errors';

const SALT_ROUNDS = env.BCRYPT_ROUNDS || 12;
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_DAYS = 30; // 30 días por arquitectura

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

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  businessName: string;
  businessSlug: string;
  businessType: any; // Typed as BusinessType in Zod schema
  whatsapp: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  private generateAccessToken(user: { id: string; email: string; role: Role; businessId: string }) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    };
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  }

  private generateOpaqueToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  private async createSession(userId: string, tokenPlain: string, userAgent?: string) {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
    await prisma.session.create({
      data: {
        userId,
        token: tokenHash,
        userAgent,
        expiresAt,
      },
    });
    return { expiresAt };
  }

  private async revokeSessionByToken(tokenPlain: string) {
    const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
    await prisma.session.deleteMany({ where: { token: tokenHash } });
  }

  private async rotateSession(oldTokenPlain: string, userId: string, userAgent?: string) {
    // Revoke old
    await this.revokeSessionByToken(oldTokenPlain);
    // Issue new
    const newToken = this.generateOpaqueToken();
    await this.createSession(userId, newToken, userAgent);
    return newToken;
  }

  async register(data: RegisterInput) {
    // 1. Check if email already exists
    const existingUser = await prisma.storeUser.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw Errors.Conflict('El correo electrónico ya está registrado');
    }

    // 2. Check if business slug exists
    const existingSlug = await prisma.business.findUnique({ where: { slug: data.businessSlug } });
    if (existingSlug) {
      throw Errors.Conflict('La URL del negocio ya está en uso');
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // 4. Transaction: Create Business + User (Owner)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const business = await tx.business.create({
        data: {
          name: data.businessName,
          slug: data.businessSlug,
          type: data.businessType,
          whatsapp: normalizeWhatsapp(data.whatsapp),
        },
      });

      const user = await tx.storeUser.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          role: Role.OWNER,   
          businessId: business.id,
        },
      });

      return { business, user };
    });

    // 5. Generate access token and refresh session
    const accessToken = this.generateAccessToken(result.user);
    const refreshToken = this.generateOpaqueToken();
    await this.createSession(result.user.id, refreshToken);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      business: result.business,
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginInput) {
    const user = await prisma.storeUser.findUnique({ where: { email: data.email } });
    if (!user) {
      throw Errors.Unauthorized(); // Generic message for security
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw Errors.Unauthorized();
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateOpaqueToken();
    await this.createSession(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
      },
      accessToken,
      refreshToken,
    };
  }

  async loginDelivery(data: LoginInput) {
    const deliveryPerson = await prisma.deliveryPerson.findUnique({ where: { email: data.email } });
    if (!deliveryPerson) {
      throw Errors.Unauthorized(); 
    }

    if (!deliveryPerson.passwordHash) {
      throw Errors.Unauthorized('El usuario no tiene contraseña configurada. Contacte al administrador.');
    }

    const isValid = await bcrypt.compare(data.password, deliveryPerson.passwordHash);
    if (!isValid) {
      throw Errors.Unauthorized();
    }

    // Generate tokens specifically for delivery person
    // Note: We might need to adjust token payload or role handling if delivery persons become a distinct user type in Auth system
    // For now, we will use a custom payload structure or reuse existing if compatible
    
    // Since delivery persons are not StoreUser, we need a way to distinguish them in the token or create a session.
    // However, the current session table is linked to StoreUser.
    // Option 1: Add deliveryPersonId to Session table (schema change required)
    // Option 2: Use a different token strategy or just JWT without session persistence for MVP
    // Let's use JWT only for now as per "MVP" approach, or we can link session if we update schema.
    
    // Given the constraints and existing schema, let's just return a JWT with a specific role claim
    // We can use a special role or flag in the token payload.
    
    const payload = {
      userId: deliveryPerson.id,
      email: deliveryPerson.email,
      role: 'DELIVERY_PERSON', // Custom role
      businessId: deliveryPerson.businessId,
    };
    
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    // No refresh token/session for delivery app in this iteration unless schema is updated
    
    return {
      user: {
        id: deliveryPerson.id,
        email: deliveryPerson.email,
        name: deliveryPerson.name,
        role: 'DELIVERY_PERSON',
        businessId: deliveryPerson.businessId,
      },
      accessToken,
    };
  }

  async refreshToken(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await prisma.session.findUnique({ where: { token: tokenHash } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      // Reutilización o token inválido: revocar todas las sesiones del usuario si se puede inferir
      if (session?.userId) {
        await prisma.session.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw Errors.Unauthorized();
    }

    const user = await prisma.storeUser.findUnique({ where: { id: session.userId } });
    if (!user) throw Errors.Unauthorized();

    // Rotar el token: eliminar sesión anterior y crear una nueva
    const newRefresh = this.generateOpaqueToken();
    await prisma.$transaction(async (tx) => {
      await tx.session.delete({ where: { token: tokenHash } });
      const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
      await tx.session.create({
        data: {
          userId: user.id,
          token: newHash,
          userAgent: session.userAgent,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
        },
      });
    });

    const accessToken = this.generateAccessToken(user);
    return { accessToken, refreshToken: newRefresh };
  }

  async logout(token?: string) {
    if (token) {
      await this.revokeSessionByToken(token);
    }
    return { success: true };
  }
}

export const authService = new AuthService();
