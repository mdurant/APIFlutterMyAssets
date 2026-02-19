import { Request, Response } from 'express';
import { asyncHandler, getDto } from '../../common/validate';
import * as termsService from './terms.service';
import type { AcceptTermsDto } from './terms.dto';

export const getActive = asyncHandler(async (req: Request, res: Response) => {
  const term = await termsService.getActiveTerm();
  if (!term) {
    return res.status(404).json({
      success: false,
      error: 'NO_ACTIVE_TERMS',
      message: 'No hay términos activos.',
    });
  }
  res.json({
    success: true,
    data: {
      id: term.id,
      version: term.version,
      title: term.title,
      content: term.content,
      active: term.active,
      createdAt: term.createdAt,
    },
  });
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dto = getDto<AcceptTermsDto>(req);
  const result = await termsService.acceptTerms(
    userId,
    { termId: dto.termId, version: dto.version },
    req
  );
  if ('error' in result) {
    return res.status(404).json({
      success: false,
      error: result.error,
      message: result.message,
    });
  }
  res.json({
    success: true,
    data: { termId: result.termId, termVersion: result.termVersion },
  });
});
