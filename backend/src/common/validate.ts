import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { logger } from './logger';

function validatePayload(DtoClass: new () => object, payload: unknown) {
  return plainToInstance(DtoClass, payload, {
    enableImplicitConversion: true,
  });
}

export function validateBody(DtoClass: new () => object) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validatePayload(DtoClass, req.body);
      const errors = await validate(dto as object);
      if (errors.length > 0) {
        const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
        logger.warn(
          { path: req.path, method: req.method, error: 'VALIDATION_ERROR', details: messages },
          `Validación fallida: ${messages[0] ?? 'Datos inválidos'}`
        );
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: messages[0] ?? 'Datos inválidos',
          details: messages,
        });
      }
      (req as Request & { dto: object }).dto = dto;
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Valida query string y adjunta resultado en req.dto (para GET con query params). */
export function validateQuery(DtoClass: new () => object) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validatePayload(DtoClass, req.query);
      const errors = await validate(dto as object);
      if (errors.length > 0) {
        const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
        logger.warn(
          { path: req.path, method: req.method, error: 'VALIDATION_ERROR', details: messages },
          `Validación query fallida: ${messages[0] ?? 'Datos inválidos'}`
        );
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: messages[0] ?? 'Datos inválidos',
          details: messages,
        });
      }
      (req as Request & { dto: object }).dto = dto;
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void | Response>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/** Obtiene el DTO validado adjuntado por validateBody (req.dto). */
export function getDto<T>(req: Request): T {
  const dto = (req as Request & { dto?: T }).dto;
  if (!dto) throw new Error('DTO no encontrado; asegúrate de usar validateBody antes.');
  return dto as T;
}

/** Devuelve el router como any para registrar middlewares + handlers sin conflicto de tipos Express. */
export function asAnyRouter(router: import('express').Router): any {
  return router;
}
