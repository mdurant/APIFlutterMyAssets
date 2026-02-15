import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config, isDev } from './config';
import { prisma } from './database/prisma';
import authRoutes from './modules/auth/auth.routes';

const app = express();

// Seguridad y middleware base
app.use(helmet());
app.use(
  cors({
    origin: isDev ? true : process.env.CORS_ORIGIN ?? '*',
    credentials: true,
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
    res.json({ success: true, data: { database: 'connected' } });
  } catch (e) {
    res.status(503).json({
      success: false,
      error: 'DB_UNAVAILABLE',
      message: 'Base de datos no disponible',
    });
  }
});

// Auth
app.use(`${config.apiPrefix}/auth`, authRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Recurso no encontrado' });
});

// Error handler global
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: isDev ? err.message : 'Error interno del servidor',
  });
});

async function start() {
  try {
    await prisma.$connect();
    app.listen(config.port, () => {
      console.log(`[Flutter My Assets] API en http://localhost:${config.port}`);
      console.log(`[Health] http://localhost:${config.port}/health`);
      console.log(`[API]    http://localhost:${config.port}${config.apiPrefix}`);
    });
  } catch (e) {
    console.error('No se pudo conectar a la BD o iniciar el servidor:', e);
    process.exit(1);
  }
}

start();
