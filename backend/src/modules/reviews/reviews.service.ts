import { prisma } from '../../database/prisma';
import { writeAuditLog } from '../../common/audit';
import type { Request } from 'express';
import type { CreateReviewDto } from './reviews.dto';

export async function listByProperty(propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
  });
  if (!property) return null;
  const reviews = await prisma.review.findMany({
    where: { propertyId },
    include: {
      user: { select: { id: true, nombres: true, apellidos: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return reviews.map((r) => ({
    id: r.id,
    propertyId: r.propertyId,
    userId: r.userId,
    userName: `${r.user.nombres} ${r.user.apellidos}`.trim(),
    rating: r.rating,
    comment: r.comment,
    mediaUrl: r.mediaUrl,
    createdAt: r.createdAt,
  }));
}

export async function createReview(
  propertyId: string,
  userId: string,
  dto: CreateReviewDto,
  req?: Request
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
  });
  if (!property) return { error: 'NOT_FOUND' as const };
  const review = await prisma.review.create({
    data: {
      propertyId,
      userId,
      rating: dto.rating,
      comment: dto.comment?.trim() ?? null,
      mediaUrl: dto.mediaUrl?.trim() ?? null,
    },
  });
  await writeAuditLog({
    action: 'CREATE',
    entity: 'Review',
    entityId: review.id,
    userId,
    afterJson: { id: review.id, propertyId, rating: review.rating },
    req,
  });
  return review;
}
