// @ts-nocheck — mezcla de RequestHandler y asyncHandler en rutas.
import { Router } from 'express';
import { asyncHandler, asAnyRouter } from '../../common/validate';
import { requireAuth, requireTermsAccepted } from '../../common/middleware/auth';
import * as favoritesController from './favorites.controller';

const router = Router();
const r = asAnyRouter(router);
r.use(requireAuth, requireTermsAccepted);
r.post('/:propertyId', asyncHandler(favoritesController.add));
r.delete('/:propertyId', asyncHandler(favoritesController.remove));
r.get('/', asyncHandler(favoritesController.list));

export default router;
