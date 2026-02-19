import { Request, Response } from 'express';
import { asyncHandler, getDto } from '../../common/validate';
import * as bookingsService from './bookings.service';
import type { CreateBookingDto } from './bookings.dto';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dto = getDto<CreateBookingDto>(req);
  const result = await bookingsService.createBooking(userId, dto, req);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.status(201).json({ success: true, data: result });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const data = await bookingsService.listByUser(userId, status);
  res.json({ success: true, data });
});
