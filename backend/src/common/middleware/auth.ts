import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { prisma } from '../../database/prisma';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  type?: string;
}

export interface AuthLocals {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthLocals;
    }
  }
}

const BEARER = 'Bearer ';

/**
 * Middleware: verifica JWT access token y adjunta req.user (userId, email, role).
 * Responde 401 si no hay token o es inválido.
 */
export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith(BEARER)) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Token de acceso requerido.',
    });
    return;
  }
  const token = authHeader.slice(BEARER.length);
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    if (payload.type && payload.type !== 'access') {
      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Tipo de token inválido.',
      });
      return;
    }
    req.user = {
      userId: payload.sub,
      email: payload.email ?? '',
      role: payload.role ?? 'USER',
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token inválido o expirado.',
    });
  }
};

/**
 * Middleware: debe usarse después de requireAuth. Comprueba que el usuario
 * tenga términos aceptados (users.terms_accepted_at no nulo). Si no, 403.
 * Regla: cualquier endpoint "post-login real" debe exigir terms accepted.
 */
export const requireTermsAccepted: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Autenticación requerida.',
    });
    return;
  }
  prisma.user
    .findUnique({
      where: { id: req.user.userId, deletedAt: null },
      select: { termsAcceptedAt: true },
    })
    .then((user) => {
      if (!user || user.termsAcceptedAt === null) {
        res.status(403).json({
          success: false,
          error: 'TERMS_NOT_ACCEPTED',
          message: 'Debe aceptar los términos y condiciones para continuar.',
        });
        return;
      }
      next();
    })
    .catch(next);
};

/** Encadenado: requireAuth + requireTermsAccepted. Usar en rutas que requieren login y términos aceptados. */
export const requireAuthAndTerms: RequestHandler = (req, res, next) => {
  requireAuth(req, res, (err?) => {
    if (err) return next(err);
    requireTermsAccepted(req, res, next);
  });
};
