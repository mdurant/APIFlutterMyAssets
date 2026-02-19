import { Request, Response } from 'express';
import { asyncHandler, getDto } from '../../common/validate';
import { propertyImageUrl } from '../../common/upload';
import * as propertiesService from './properties.service';
import type { CreatePropertyDto, UpdatePropertyDto, QueryPropertiesDto } from './properties.dto';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dto = getDto<CreatePropertyDto>(req);
  const property = await propertiesService.createProperty(userId, dto, req);
  res.status(201).json({ success: true, data: property });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const dto = getDto<UpdatePropertyDto>(req);
  const result = await propertiesService.updateProperty(id, userId, dto, req);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.json({ success: true, data: result });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const result = await propertiesService.softDeleteProperty(id, userId, req);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.json({ success: true, data: result });
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const result = await propertiesService.publishProperty(id, userId, req);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.json({ success: true, data: result });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const result = await propertiesService.archiveProperty(id, userId, req);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.json({ success: true, data: result });
});

export const addImage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const file = (req as Request & { file?: { filename: string } }).file;
  const url = file ? propertyImageUrl(file.filename) : (req.body?.url as string | undefined);
  const sortOrder = typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined;
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_IMAGE',
      message: 'Incluya un archivo (multipart) o body.url.',
    });
  }
  const result = await propertiesService.addPropertyImage(id, userId, url, sortOrder ?? 0, req);
  if (result && 'error' in result) {
    return res.status(404).json({ success: false, error: result.error, message: 'Propiedad no encontrada.' });
  }
  res.status(201).json({ success: true, data: result });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const property = await propertiesService.getPropertyById(id);
  if (!property) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Propiedad no encontrada.',
    });
  }
  res.json({ success: true, data: property });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = getDto<QueryPropertiesDto>(req);
  const result = await propertiesService.listProperties(query);
  res.json({ success: true, data: result });
});
