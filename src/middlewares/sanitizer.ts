import { Request, Response, NextFunction } from 'express';

/**
 * Deeply checks an object for potential NoSQL injection patterns ($ prefixes or dots in keys)
 */
export function hasNoSqlInjection(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    const val = obj[key];
    if (val && typeof val === 'object') {
      if (hasNoSqlInjection(val)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Middleware that strictly blocks requests containing NoSQL injection operators ($gt, $ne, $where, etc.)
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  if (req.body && hasNoSqlInjection(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Malicious payload detected: Query operators are strictly prohibited in request body.'
    });
  }

  if (req.query && hasNoSqlInjection(req.query)) {
    return res.status(400).json({
      success: false,
      message: 'Malicious query detected: Query operators are strictly prohibited in URL parameters.'
    });
  }

  next();
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
