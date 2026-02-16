import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? '';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logPayload = {
      method: req.method,
      url: req.originalUrl ?? req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip,
    };
    if (res.statusCode >= 500) {
      logger.error(logPayload, `HTTP ${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${duration}ms`);
    } else if (res.statusCode >= 400) {
      logger.warn(logPayload, `HTTP ${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${duration}ms`);
    } else {
      logger.info(logPayload, `HTTP ${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
}
