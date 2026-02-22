import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError, NotBeforeError } from 'jsonwebtoken';
import { env } from '../lib/env';
import { Role } from '@ventasve/database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    businessId: string;
    role: Role;
    email: string;
  };
}

interface JWTPayload {
  userId: string;
  businessId: string;
  role: Role;
  email: string;
  iat: number;
  exp: number;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!env.JWT_SECRET) {
    return res.status(500).json({
      error: 'Server configuration error',
      code: 'CONFIG_ERROR'
    });
  }

  if (!authHeader) {
    return res.status(401).json({
      error: 'No token provided',
      code: 'MISSING_TOKEN'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Invalid authorization header format',
      code: 'INVALID_HEADER_FORMAT'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({
      error: 'Empty or invalid token',
      code: 'EMPTY_TOKEN'
    });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    if (!payload.userId || !payload.businessId || !payload.role) {
      return res.status(401).json({
        error: 'Invalid token payload',
        code: 'INVALID_PAYLOAD'
      });
    }

    req.user = {
      userId: payload.userId,
      businessId: payload.businessId,
      role: payload.role,
      email: payload.email
    };

    if (env.NODE_ENV === 'development') {
      console.log(`[authenticate] User authenticated: ${payload.email} (${payload.role})`);
    }

    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (err instanceof JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    if (err instanceof NotBeforeError) {
      return res.status(401).json({
        error: 'Token not active yet',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }

    return res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};
