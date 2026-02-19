// @ts-nocheck — mezcla de RequestHandler (3 args) y asyncHandler en rutas; tipos Express estrictos.
import { Router } from 'express';
import { validateBody, asyncHandler, asAnyRouter } from '../../common/validate';
import { requireAuth, requireTermsAccepted } from '../../common/middleware/auth';
import * as bookingsController from './bookings.controller';
import { CreateBookingDto } from './bookings.dto';

const router = Router();
const r = asAnyRouter(router);
r.use(requireAuth, requireTermsAccepted);
r.post('/', validateBody(CreateBookingDto), asyncHandler(bookingsController.create));
r.get('/', asyncHandler(bookingsController.list));

export default router;
