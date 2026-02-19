import { Request, Response } from 'express';
import { asyncHandler } from '../../common/validate';
import * as favoritesService from './favorites.service';

export const add = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const propertyId = req.params.propertyId as string;
  const result = await favoritesService.addFavorite(userId, propertyId);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.status(201).json(result);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const propertyId = req.params.propertyId as string;
  await favoritesService.removeFavorite(userId, propertyId);
  res.json({ success: true, message: 'Eliminado de favoritos.' });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const data = await favoritesService.listFavorites(userId);
  res.json({ success: true, data });
});
