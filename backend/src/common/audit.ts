import { Request } from 'express';
import { prisma } from '../database/prisma';

export type AuditAction =
  | 'LOGIN'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ACCEPT_TERMS'
  | 'PUBLISH_PROPERTY'
  | 'ARCHIVE_PROPERTY';

export interface AuditParams {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  beforeJson?: object | null;
  afterJson?: object | null;
  req?: Request;
}

function getIpAndAgent(req?: Request): { ip: string | null; userAgent: string | null } {
  if (!req) return { ip: null, userAgent: null };
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = (req.headers['user-agent'] as string) ?? null;
  return { ip: ip ?? null, userAgent };
}

/**
 * Escribe un registro en audit_logs. Usar en CREATE, UPDATE, DELETE, ACCEPT_TERMS,
 * PUBLISH_PROPERTY, ARCHIVE_PROPERTY para Property, Review, Message, Booking, etc.
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
  const { ip, userAgent } = getIpAndAgent(params.req);
  await prisma.auditLog.create({
    data: {
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      userId: params.userId ?? null,
      beforeJson: params.beforeJson ?? undefined,
      afterJson: params.afterJson ?? undefined,
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    },
  });
}
