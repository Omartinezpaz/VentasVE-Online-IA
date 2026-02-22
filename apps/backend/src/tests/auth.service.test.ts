import prisma from '../tests/prisma-mock';
import { authService } from '../services/auth.service';
import crypto from 'crypto';

jest.mock('../lib/env', () => ({
  env: {
    BCRYPT_ROUNDS: 4,
    JWT_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'refresh-secret'
  }
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('access-token')
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('register lanza Conflict si el email ya existe', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'u1' });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        businessName: 'Test Biz',
        businessSlug: 'test-biz',
        businessType: 'RESTAURANT',
        whatsapp: '+584121234567'
      } as any)
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT'
    });

    expect(prisma.business.findUnique).not.toHaveBeenCalled();
  });

  it('register lanza Conflict si el slug de negocio ya existe', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'b1' });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        businessName: 'Test Biz',
        businessSlug: 'test-biz',
        businessType: 'RESTAURANT',
        whatsapp: '+584121234567'
      } as any)
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT'
    });
  });

  it('register crea negocio, usuario, sesión y tokens cuando todo es válido', async () => {
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-password');

    (prisma as any).$transaction = jest.fn(async (fn: any) => {
      const tx = {
        business: {
          create: jest.fn().mockResolvedValue({
            id: 'b1',
            name: 'Test Biz',
            slug: 'test-biz',
            type: 'RESTAURANT',
            whatsapp: '+584121234567'
          })
        },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'u1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'OWNER',
            businessId: 'b1',
            passwordHash: 'hashed-password'
          })
        }
      };
      return fn(tx);
    });

    (prisma.session.create as jest.Mock).mockResolvedValueOnce({ id: 's1' });

    const result = await authService.register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      businessName: 'Test Biz',
      businessSlug: 'test-biz',
      businessType: 'RESTAURANT',
      whatsapp: '+58 412-1234567'
    } as any);

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', expect.any(Number));
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        email: 'test@example.com'
      }),
      'test-secret',
      expect.any(Object)
    );

    expect(prisma.session.create).toHaveBeenCalledTimes(1);

    expect(result.user).toMatchObject({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'OWNER'
    });
    expect(result.business).toMatchObject({
      id: 'b1',
      slug: 'test-biz'
    });
    expect(result.accessToken).toBe('access-token');
    expect(typeof result.refreshToken).toBe('string');
  });

  it('login lanza Unauthorized si el usuario no existe', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'password123'
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED'
    });
  });

  it('login lanza Unauthorized si la contraseña es incorrecta', async () => {
    const bcrypt = require('bcrypt');

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'OWNER',
      businessId: 'b1',
      passwordHash: 'hashed-password'
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'wrong'
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED'
    });
  });

  it('login devuelve usuario, tokens y crea sesión cuando las credenciales son válidas', async () => {
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'OWNER',
      businessId: 'b1',
      passwordHash: 'hashed-password'
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    (prisma.session.create as jest.Mock).mockResolvedValueOnce({ id: 's1' });

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(jwt.sign).toHaveBeenCalled();
    expect(prisma.session.create).toHaveBeenCalledTimes(1);

    expect(result.user).toMatchObject({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'OWNER',
      businessId: 'b1'
    });
    expect(result.accessToken).toBe('access-token');
    expect(typeof result.refreshToken).toBe('string');
  });

  it('refreshToken lanza Unauthorized si la sesión no existe o está inválida', async () => {
    (prisma.session.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(authService.refreshToken('old-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED'
    });
  });

  it('refreshToken rota el token cuando la sesión es válida', async () => {
    const jwt = require('jsonwebtoken');

    const tokenPlain = 'old-token';
    const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');

    (prisma.session.findUnique as jest.Mock).mockResolvedValueOnce({
      token: tokenHash,
      userId: 'u1',
      userAgent: 'UA',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'OWNER',
      businessId: 'b1'
    });

    (prisma as any).$transaction = jest.fn(async (fn: any) => {
      const tx = {
        session: {
          delete: jest.fn().mockResolvedValue(undefined),
          create: jest.fn().mockResolvedValue({ id: 's2' })
        }
      };
      await fn(tx);
    });

    const result = await authService.refreshToken(tokenPlain);

    expect(prisma.session.findUnique).toHaveBeenCalledWith({ where: { token: tokenHash } });
    expect((jwt.sign as jest.Mock)).toHaveBeenCalled();
    expect(typeof result.refreshToken).toBe('string');
    expect(result.accessToken).toBe('access-token');
  });

  it('logout con token revoca la sesión correspondiente', async () => {
    const token = 'some-token';
    const expectedHash = crypto.createHash('sha256').update(token).digest('hex');

    (prisma.session.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });

    const result = await authService.logout(token);

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: expectedHash } });
    expect(result).toEqual({ success: true });
  });

  it('logout sin token no toca sesiones y retorna success', async () => {
    const result = await authService.logout();

    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });
});
