import { prisma } from '../../database/prisma';
import { writeAuditLog } from '../../common/audit';
import type { Request } from 'express';
import type { CreateBookingDto } from './bookings.dto';

export async function createBooking(userId: string, dto: CreateBookingDto, req?: Request) {
  const property = await prisma.property.findFirst({
    where: { id: dto.propertyId, deletedAt: null },
  });
  if (!property) return { error: 'NOT_FOUND' as const };
  const booking = await prisma.booking.create({
    data: {
      propertyId: dto.propertyId,
      userId,
      dateFrom: new Date(dto.dateFrom),
      dateTo: new Date(dto.dateTo),
      note: dto.note?.trim() ?? null,
      status: 'PENDING',
    },
  });
  await writeAuditLog({
    action: 'CREATE',
    entity: 'Booking',
    entityId: booking.id,
    userId,
    afterJson: { id: booking.id, propertyId: booking.propertyId, status: booking.status },
    req,
  });
  return booking;
}

export async function listByUser(userId: string, status?: string) {
  const where: { userId: string; status?: string } = { userId };
  if (status) where.status = status;
  const list = await prisma.booking.findMany({
    where,
    include: {
      property: {
        select: { id: true, title: true, address: true, city: true, type: true },
      },
    },
    orderBy: { dateFrom: 'desc' },
  });
  return list;
}
