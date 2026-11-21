import { Request, Response, NextFunction } from 'express';
import { verifyJwt, UserPayload } from '../utils/auth.js';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

/**
 * Middleware that strictly requires a valid Bearer JWT.
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Missing Authorization Bearer token'
    });
  }

  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid or expired token'
    });
  }

  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    name: payload.name
  };

  next();
}

/**
 * Optional authentication: Extracts user if token is present, but doesn't block unauthenticated requests.
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token) {
    const payload = verifyJwt(token);
    if (payload) {
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name
      };
    }
  }

  next();
}
