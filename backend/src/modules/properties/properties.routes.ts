// @ts-nocheck — mezcla de RequestHandler y asyncHandler en rutas.
import { Router } from 'express';
import { validateBody, validateQuery, asyncHandler } from '../../common/validate';
import { requireAuth, requireTermsAccepted } from '../../common/middleware/auth';
import { uploadPropertyImage } from '../../common/upload';
import * as propertiesController from './properties.controller';
import * as reviewsController from '../reviews/reviews.controller';
import { CreatePropertyDto, UpdatePropertyDto, QueryPropertiesDto } from './properties.dto';
import { CreateReviewDto } from '../reviews/reviews.dto';
import { asAnyRouter } from '../../common/validate';

const router = Router();
const r = asAnyRouter(router);

/** GET /properties — listado/búsqueda (público, solo PUBLISHED) */
r.get('/', validateQuery(QueryPropertiesDto), asyncHandler(propertiesController.list));

/** GET /properties/:id/reviews — listado de reseñas (público) */
router.get('/:id/reviews', asyncHandler(reviewsController.listByProperty));

/** POST /properties/:id/reviews — crear reseña (auth + terms) */
r.post(
  '/:id/reviews',
  requireAuth,
  requireTermsAccepted,
  validateBody(CreateReviewDto),
  asyncHandler(reviewsController.create)
);

/** GET /properties/:id — detalle (público) */
router.get('/:id', asyncHandler(propertiesController.getById));

/** Rutas protegidas (auth + terms accepted) */
r.post(
  '/',
  requireAuth,
  requireTermsAccepted,
  validateBody(CreatePropertyDto),
  asyncHandler(propertiesController.create)
);
r.put(
  '/:id',
  requireAuth,
  requireTermsAccepted,
  validateBody(UpdatePropertyDto),
  asyncHandler(propertiesController.update)
);
r.delete('/:id', requireAuth, requireTermsAccepted, asyncHandler(propertiesController.remove));
r.post('/:id/publish', requireAuth, requireTermsAccepted, asyncHandler(propertiesController.publish));
r.post('/:id/archive', requireAuth, requireTermsAccepted, asyncHandler(propertiesController.archive));
r.post(
  '/:id/images',
  requireAuth,
  requireTermsAccepted,
  (req: any, res: any, next: any) => {
    uploadPropertyImage(req, res, (err: unknown) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: 'UPLOAD_ERROR',
          message: err instanceof Error ? err.message : 'Error al subir imagen',
        });
      }
      next();
    });
  },
  asyncHandler(propertiesController.addImage)
);

export default router;
