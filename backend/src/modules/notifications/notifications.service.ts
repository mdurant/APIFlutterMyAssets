import { prisma } from '../../database/prisma';

export async function listByUser(userId: string, unreadOnly?: boolean) {
  const where: { userId: string; readAt?: null } = { userId };
  if (unreadOnly) where.readAt = null;
  const list = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return list;
}

export async function markAsRead(notificationId: string, userId: string) {
  const n = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!n) return { error: 'NOT_FOUND' as const };
  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
  return updated;
}
