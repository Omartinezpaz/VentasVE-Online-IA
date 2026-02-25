import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError, NotBeforeError } from 'jsonwebtoken';
import { env } from '../lib/env';

export interface CustomerAuthRequest extends Request {
  customer?: {
    customerId: string;
    businessId: string;
    email: string;
    profileType: string;
  };
}

interface CustomerJWTPayload {
  sub: string;
  email: string;
  businessId: string;
  profileType: string;
  iat: number;
  exp: number;
}

export const authenticateCustomer = (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
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
    const payload = jwt.verify(token, env.JWT_SECRET) as CustomerJWTPayload;

    if (!payload.sub || !payload.businessId) {
      return res.status(401).json({
        error: 'Invalid token payload',
        code: 'INVALID_PAYLOAD'
      });
    }

    req.customer = {
      customerId: payload.sub,
      businessId: payload.businessId,
      email: payload.email,
      profileType: payload.profileType
    };

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

