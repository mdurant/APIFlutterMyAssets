// @ts-nocheck — mezcla de RequestHandler y asyncHandler en rutas.
import { Router } from 'express';
import { asyncHandler, asAnyRouter } from '../../common/validate';
import { requireAuth, requireTermsAccepted } from '../../common/middleware/auth';
import * as notificationsController from './notifications.controller';

const router = Router();
const r = asAnyRouter(router);
r.use(requireAuth, requireTermsAccepted);
r.get('/', asyncHandler(notificationsController.list));
r.post('/:id/read', asyncHandler(notificationsController.markRead));

export default router;
