// @ts-nocheck — mezcla de RequestHandler y asyncHandler en rutas.
import { Router } from 'express';
import { validateBody, asyncHandler, asAnyRouter } from '../../common/validate';
import { requireAuth, requireTermsAccepted } from '../../common/middleware/auth';
import * as conversationsController from './conversations.controller';
import { CreateConversationDto, SendMessageDto } from './conversations.dto';

const router = Router();
const r = asAnyRouter(router);
r.use(requireAuth, requireTermsAccepted);
r.post('/', validateBody(CreateConversationDto), asyncHandler(conversationsController.create));
r.get('/', asyncHandler(conversationsController.list));
r.get('/:id/messages', asyncHandler(conversationsController.getMessages));
r.post('/:id/messages', validateBody(SendMessageDto), asyncHandler(conversationsController.sendMessage));

export default router;
