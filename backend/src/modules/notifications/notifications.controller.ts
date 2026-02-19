import { Request, Response } from 'express';
import { asyncHandler } from '../../common/validate';
import * as notificationsService from './notifications.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const unreadOnly = req.query.unread === 'true' || req.query.unread === '1';
  const data = await notificationsService.listByUser(userId, unreadOnly);
  res.json({ success: true, data });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const result = await notificationsService.markAsRead(id, userId);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Notificación no encontrada.' });
  }
  res.json({ success: true, data: result });
});
