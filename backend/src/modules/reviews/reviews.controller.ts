import { Request, Response } from 'express';
import { asyncHandler, getDto } from '../../common/validate';
import * as reviewsService from './reviews.service';
import type { CreateReviewDto } from './reviews.dto';

export const listByProperty = asyncHandler(async (req: Request, res: Response) => {
  const propertyId = req.params.id as string;
  const list = await reviewsService.listByProperty(propertyId);
  if (list === null) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Propiedad no encontrada.' });
  }
  res.json({ success: true, data: list });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const propertyId = req.params.id as string;
  const dto = getDto<CreateReviewDto>(req);
  const result = await reviewsService.createReview(propertyId, userId, dto, req);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.status(201).json({ success: true, data: result });
});
