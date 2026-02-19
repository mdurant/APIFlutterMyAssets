// @ts-nocheck — mezcla de RequestHandler y asyncHandler en rutas.
import { Router } from 'express';
import { validateBody, asyncHandler, asAnyRouter } from '../../common/validate';
import { requireAuth } from '../../common/middleware/auth';
import * as termsController from './terms.controller';
import { AcceptTermsDto } from './terms.dto';

const router = Router();
const r = asAnyRouter(router);

/** GET /terms/active — versión activa (público para leer; post-login para aceptar) */
router.get('/active', asyncHandler(termsController.getActive));

/** POST /terms/accept — aceptar términos (requiere auth + guarda en user_terms_acceptances + audit) */
r.post('/accept', requireAuth, validateBody(AcceptTermsDto), asyncHandler(termsController.accept));

export default router;
