import { prisma } from '../../database/prisma';
import { writeAuditLog } from '../../common/audit';
import type { Request } from 'express';

export async function findOrCreateConversation(
  userId: string,
  propertyId: string,
  req?: Request
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!property || !property.userId) return { error: 'NOT_FOUND' as const };
  const ownerUserId = property.userId;
  if (ownerUserId === userId) return { error: 'OWN_PROPERTY' as const };
  let conv = await prisma.conversation.findFirst({
    where: { propertyId, renterUserId: userId },
    include: { property: { select: { title: true } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
  });
  if (conv) return conv;
  return prisma.conversation.create({
    data: { propertyId, ownerUserId, renterUserId: userId },
    include: { property: { select: { title: true } } },
  });
}

export async function listConversations(userId: string) {
  const list = await prisma.conversation.findMany({
    where: { OR: [{ ownerUserId: userId }, { renterUserId: userId }] },
    include: {
      property: { select: { id: true, title: true, status: true } },
      ownerUser: { select: { id: true, nombres: true, apellidos: true } },
      renterUser: { select: { id: true, nombres: true, apellidos: true } },
      messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { body: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return list.map((c) => ({
    id: c.id,
    propertyId: c.propertyId,
    propertyTitle: c.property.title,
    ownerUserId: c.ownerUserId,
    renterUserId: c.renterUserId,
    lastMessage: c.messages[0] ?? null,
    createdAt: c.createdAt,
  }));
}

export async function getMessages(conversationId: string, userId: string) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ ownerUserId: userId }, { renterUserId: userId }] },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { senderUser: { select: { id: true, nombres: true, apellidos: true } } },
      },
    },
  });
  return conv;
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  body: string,
  type: string,
  req?: Request
) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ ownerUserId: userId }, { renterUserId: userId }] },
  });
  if (!conv) return { error: 'NOT_FOUND' as const };
  const msg = await prisma.message.create({
    data: { conversationId, senderUserId: userId, body, type: type || 'text' },
  });
  await writeAuditLog({
    action: 'CREATE',
    entity: 'Message',
    entityId: msg.id,
    userId,
    afterJson: { id: msg.id, conversationId },
    req,
  });
  return msg;
}
