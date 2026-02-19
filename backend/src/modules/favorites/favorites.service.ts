import { prisma } from '../../database/prisma';
import type { Request } from 'express';

export async function addFavorite(userId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null, status: 'PUBLISHED' },
  });
  if (!property) return { error: 'NOT_FOUND' as const };
  const existing = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
  });
  if (existing) return { success: true, data: existing };
  const fav = await prisma.favorite.create({
    data: { userId, propertyId },
  });
  return { success: true, data: fav };
}

export async function removeFavorite(userId: string, propertyId: string) {
  const deleted = await prisma.favorite.deleteMany({
    where: { userId, propertyId },
  });
  return { success: true, deleted: deleted.count };
}

export async function listFavorites(userId: string) {
  const list = await prisma.favorite.findMany({
    where: { userId },
    include: {
      property: {
        include: {
          propertyImages: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
          _count: { select: { reviews: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return list
    .filter((f) => f.property && f.property.deletedAt === null)
    .map((f) => ({
      id: f.id,
      propertyId: f.property!.id,
      title: f.property!.title,
      address: f.property!.address,
      city: f.property!.city,
      price: f.property!.price?.toString(),
      currency: f.property!.currency,
      type: f.property!.type,
      imageUrl: f.property!.propertyImages[0]?.url ?? null,
      reviewsCount: f.property!._count.reviews,
      createdAt: f.createdAt,
    }));
}
