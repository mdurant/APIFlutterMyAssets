import 'reflect-metadata';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config, isDev } from './config';
import { prisma } from './database/prisma';
import authRoutes from './modules/auth/auth.routes';
import regionsRoutes from './routes/regions.routes';
import termsRoutes from './modules/terms/terms.routes';
import propertiesRoutes from './modules/properties/properties.routes';
import favoritesRoutes from './modules/favorites/favorites.routes';
import conversationsRoutes from './modules/conversations/conversations.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import { logger } from './common/logger';
import { requestLogger } from './common/middleware/request-logger';

const app = express();

// Log de todas las peticiones HTTP (method, url, statusCode, duration, ip)
app.use(requestLogger);

// Seguridad y middleware base
app.use(helmet());
// CORS: en desarrollo permitir cualquier localhost/127.0.0.1 (Flutter web, simuladores).
app.use(
  cors({
    origin: isDev
      ? (origin, cb) => {
          const allowed =
            !origin ||
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
            /^https?:\/\/\[::1\](:\d+)?$/i.test(origin);
          cb(null, allowed ? (origin || true) : false);
        }
      : process.env.CORS_ORIGIN ?? '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting general
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,
    message: { success: false, error: 'TOO_MANY_REQUESTS', message: 'Demasiadas peticiones.' },
  })
);

// Health check (sin prefijo para monitoreo)
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// API versionada
app.get(`${config.apiPrefix}/`, (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Flutter My Assets API',
      version: '1.0.0',
      docs: `${config.apiPrefix}/docs`,
    },
  });
});

// Verificación de BD
app.get(`${config.apiPrefix}/ready`, async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.debug('Ready: base de datos OK');
    res.json({ success: true, data: { database: 'connected' } });
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : e }, 'Ready: base de datos no disponible');
    res.status(503).json({
      success: false,
      error: 'DB_UNAVAILABLE',
      message: 'Base de datos no disponible',
    });
  }
});

// Archivos subidos (imágenes de propiedades)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Auth
app.use(`${config.apiPrefix}/auth`, authRoutes);

// Catálogo: regiones y comunas (para selects en registro)
app.use(config.apiPrefix, regionsRoutes);

// Términos y condiciones
app.use(`${config.apiPrefix}/terms`, termsRoutes);

// Propiedades (CRUD, búsqueda, imágenes, reviews)
app.use(`${config.apiPrefix}/properties`, propertiesRoutes);

// Favoritos, conversaciones, notificaciones, bookings (requieren auth + terms)
app.use(`${config.apiPrefix}/favorites`, favoritesRoutes);
app.use(`${config.apiPrefix}/conversations`, conversationsRoutes);
app.use(`${config.apiPrefix}/notifications`, notificationsRoutes);
app.use(`${config.apiPrefix}/bookings`, bookingsRoutes);

// 404
app.use((req, res) => {
  logger.warn({ method: req.method, url: req.originalUrl ?? req.url }, 'Recurso no encontrado (404)');
  res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Recurso no encontrado' });
});

// Error handler global
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: isDev ? err.message : 'Error interno del servidor',
  });
});

async function start() {
  try {
    logger.info('Conectando a base de datos...');
    await prisma.$connect();
    logger.info('Base de datos conectada');
    app.listen(config.port, '0.0.0.0', () => {
      logger.info(
        { port: config.port, apiPrefix: config.apiPrefix, host: '0.0.0.0' },
        `API escuchando en http://localhost:${config.port} (y en la IP de tu red para emulador/dispositivo) | Health: /health | API: ${config.apiPrefix}`
      );
    });
  } catch (e) {
    logger.fatal({ err: e }, 'No se pudo conectar a la BD o iniciar el servidor');
    process.exit(1);
  }
}

start();
