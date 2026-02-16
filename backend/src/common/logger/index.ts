import pino from 'pino';
import { config } from '../../config';

const isDev = config.nodeEnv === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { service: 'fluttermyassets-api', env: config.nodeEnv },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

/** Crea un child logger con contexto (ej: module, operation). */
export function createChildLogger(context: Record<string, string>) {
  return logger.child(context);
}
