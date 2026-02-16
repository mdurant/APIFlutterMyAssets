import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { logger } from './logger';

export function validateBody(DtoClass: new () => object) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToInstance(DtoClass, req.body);
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

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void | Response>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}
