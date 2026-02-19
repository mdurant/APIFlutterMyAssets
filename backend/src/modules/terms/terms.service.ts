import { prisma } from '../../database/prisma';
import { writeAuditLog } from '../../common/audit';
import type { Request } from 'express';

export async function getActiveTerm() {
  const term = await prisma.term.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  return term;
}

export async function acceptTerms(
  userId: string,
  payload: { termId?: string; version?: string },
  req?: Request
) {
  let term;
  if (payload.termId) {
    term = await prisma.term.findUnique({ where: { id: payload.termId } });
  } else if (payload.version) {
    term = await prisma.term.findUnique({ where: { version: payload.version } });
  } else {
    term = await prisma.term.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  if (!term) {
    return { error: 'TERM_NOT_FOUND', message: 'Términos no encontrados.' };
  }

  await prisma.userTermsAcceptance.create({
    data: {
      userId,
      termId: term.id,
      termVersion: term.version,
      acceptedAt: new Date(),
      ip: (req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req?.socket?.remoteAddress ?? undefined,
      userAgent: (req?.headers['user-agent'] as string) ?? undefined,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { termsAcceptedAt: new Date() },
  });

  await writeAuditLog({
    action: 'ACCEPT_TERMS',
    entity: 'Term',
    entityId: term.id,
    userId,
    afterJson: { termId: term.id, termVersion: term.version },
    req,
  });

  return { success: true, termId: term.id, termVersion: term.version };
}
