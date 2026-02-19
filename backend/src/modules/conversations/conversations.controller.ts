import { Request, Response } from 'express';
import { asyncHandler, getDto } from '../../common/validate';
import * as conversationsService from './conversations.service';
import type { CreateConversationDto, SendMessageDto } from './conversations.dto';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dto = getDto<CreateConversationDto>(req);
  const result = await conversationsService.findOrCreateConversation(userId, dto.propertyId, req);
  if (result && 'error' in result) {
    if (result.error === 'OWN_PROPERTY') {
      return res.status(400).json({ success: false, error: result.error, message: 'No puede chatear sobre su propia propiedad.' });
    }
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.status(201).json({ success: true, data: result });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const data = await conversationsService.listConversations(userId);
  res.json({ success: true, data });
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const conversationId = req.params.id as string;
  const conv = await conversationsService.getMessages(conversationId, userId);
  if (!conv) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Conversación no encontrada.' });
  }
  res.json({
    success: true,
    data: conv.messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderUserId: m.senderUserId,
      senderName: `${m.senderUser.nombres} ${m.senderUser.apellidos}`.trim(),
      body: m.body,
      type: m.type,
      createdAt: m.createdAt,
      readAt: m.readAt,
    })),
  });
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const conversationId = req.params.id as string;
  const dto = getDto<SendMessageDto>(req);
  const result = await conversationsService.sendMessage(
    conversationId,
    userId,
    dto.body,
    dto.type ?? 'text',
    req
  );
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Conversación no encontrada.' });
  }
  res.status(201).json({ success: true, data: result });
});
