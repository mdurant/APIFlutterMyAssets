import { Router, Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { asyncHandler } from '../common/validate';

const router = Router();

/** GET /regions - Lista todas las regiones (id UUID, nombre) para selects */
router.get(
  '/regions',
  asyncHandler(async (_req: Request, res: Response) => {
    const regions = await prisma.region.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    });
    res.json({ success: true, data: regions });
  })
);

/** GET /comunas?regionId=uuid - Lista comunas de una región (id UUID, nombre) para selects */
router.get(
  '/comunas',
  asyncHandler(async (req: Request, res: Response) => {
    const regionId = typeof req.query.regionId === 'string' ? req.query.regionId.trim() : null;
    if (!regionId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REGION_ID',
        message: 'Query regionId es requerido (UUID de la región).',
      });
    }
    const comunas = await prisma.comuna.findMany({
      where: { regionId },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    });
    res.json({ success: true, data: comunas });
  })
);

export default router;
