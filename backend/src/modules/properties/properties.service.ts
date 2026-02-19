import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { writeAuditLog } from '../../common/audit';
import type { Request } from 'express';
import type { CreatePropertyDto, UpdatePropertyDto, QueryPropertiesDto } from './properties.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function toDecimal(n: number | undefined): Prisma.Decimal | undefined {
  if (n === undefined || n === null) return undefined;
  return new Prisma.Decimal(n);
}

export async function createProperty(userId: string, dto: CreatePropertyDto, req?: Request) {
  const data: Prisma.PropertyCreateInput = {
    title: dto.title.trim(),
    description: dto.description?.trim() ?? null,
    address: dto.address?.trim() ?? null,
    city: dto.city?.trim() ?? null,
    region: dto.region?.trim() ?? null,
    latitude: toDecimal(dto.latitude),
    longitude: toDecimal(dto.longitude),
    facilities: dto.facilities ?? undefined,
    bedrooms: dto.bedrooms ?? null,
    bathrooms: dto.bathrooms ?? null,
    price: toDecimal(dto.price),
    currency: dto.currency ?? 'CLP',
    type: dto.type ?? null,
    status: 'DRAFT',
    user: { connect: { id: userId } },
  };
  const property = await prisma.property.create({ data });
  await writeAuditLog({
    action: 'CREATE',
    entity: 'Property',
    entityId: property.id,
    userId,
    afterJson: { id: property.id, title: property.title, status: property.status },
    req,
  });
  return property;
}

export async function updateProperty(
  propertyId: string,
  userId: string,
  dto: UpdatePropertyDto,
  req?: Request
) {
  const existing = await prisma.property.findFirst({
    where: { id: propertyId, userId, deletedAt: null },
  });
  if (!existing) return { error: 'NOT_FOUND' as const };
  const beforeJson = {
    title: existing.title,
    status: existing.status,
    price: existing.price?.toString(),
  };
  const updateData: Prisma.PropertyUpdateInput = {
    ...(dto.title !== undefined && { title: dto.title.trim() }),
    ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
    ...(dto.address !== undefined && { address: dto.address?.trim() ?? null }),
    ...(dto.city !== undefined && { city: dto.city?.trim() ?? null }),
    ...(dto.region !== undefined && { region: dto.region?.trim() ?? null }),
    ...(dto.latitude !== undefined && { latitude: toDecimal(dto.latitude) }),
    ...(dto.longitude !== undefined && { longitude: toDecimal(dto.longitude) }),
    ...(dto.facilities !== undefined && { facilities: dto.facilities }),
    ...(dto.bedrooms !== undefined && { bedrooms: dto.bedrooms }),
    ...(dto.bathrooms !== undefined && { bathrooms: dto.bathrooms }),
    ...(dto.price !== undefined && { price: toDecimal(dto.price) }),
    ...(dto.currency !== undefined && { currency: dto.currency }),
    ...(dto.type !== undefined && { type: dto.type }),
  };
  const property = await prisma.property.update({
    where: { id: propertyId },
    data: updateData,
  });
  await writeAuditLog({
    action: 'UPDATE',
    entity: 'Property',
    entityId: property.id,
    userId,
    beforeJson,
    afterJson: { title: property.title, status: property.status, price: property.price?.toString() },
    req,
  });
  return property;
}

export async function softDeleteProperty(propertyId: string, userId: string, req?: Request) {
  const existing = await prisma.property.findFirst({
    where: { id: propertyId, userId, deletedAt: null },
  });
  if (!existing) return { error: 'NOT_FOUND' as const };
  const beforeJson = { status: existing.status };
  await prisma.property.update({
    where: { id: propertyId },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({
    action: 'DELETE',
    entity: 'Property',
    entityId: propertyId,
    userId,
    beforeJson,
    afterJson: { deletedAt: true },
    req,
  });
  return { success: true };
}

export async function publishProperty(propertyId: string, userId: string, req?: Request) {
  const existing = await prisma.property.findFirst({
    where: { id: propertyId, userId, deletedAt: null },
  });
  if (!existing) return { error: 'NOT_FOUND' as const };
  const beforeJson = { status: existing.status };
  const property = await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'PUBLISHED' },
  });
  await writeAuditLog({
    action: 'PUBLISH_PROPERTY',
    entity: 'Property',
    entityId: propertyId,
    userId,
    beforeJson,
    afterJson: { status: 'PUBLISHED' },
    req,
  });
  return property;
}

export async function archiveProperty(propertyId: string, userId: string, req?: Request) {
  const existing = await prisma.property.findFirst({
    where: { id: propertyId, userId, deletedAt: null },
  });
  if (!existing) return { error: 'NOT_FOUND' as const };
  const beforeJson = { status: existing.status };
  const property = await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'ARCHIVED' },
  });
  await writeAuditLog({
    action: 'ARCHIVE_PROPERTY',
    entity: 'Property',
    entityId: propertyId,
    userId,
    beforeJson,
    afterJson: { status: 'ARCHIVED' },
    req,
  });
  return property;
}

export async function addPropertyImage(
  propertyId: string,
  userId: string,
  url: string,
  sortOrder: number,
  req?: Request
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId, deletedAt: null },
  });
  if (!property) return { error: 'NOT_FOUND' as const };
  const maxOrder = await prisma.propertyImage.aggregate({
    where: { propertyId },
    _max: { sortOrder: true },
  });
  const order = sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1;
  const image = await prisma.propertyImage.create({
    data: { propertyId, url, sortOrder: order },
  });
  return image;
}

export async function getPropertyById(propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    include: {
      user: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          email: true,
        },
      },
      propertyImages: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, sortOrder: true } },
      riskAssessments: {
        take: 1,
        orderBy: { updatedAt: 'desc' },
        select: { score: true, level: true, factorsJson: true },
      },
      _count: { select: { reviews: true } },
    },
  });
  if (!property) return null;
  const agent = property.user
    ? {
        id: property.user.id,
        name: `${property.user.nombres} ${property.user.apellidos}`.trim(),
        email: property.user.email,
      }
    : null;
  const risk = property.riskAssessments[0]
    ? {
        score: property.riskAssessments[0].score,
        level: property.riskAssessments[0].level,
        factors: property.riskAssessments[0].factorsJson,
      }
    : null;
  return {
    id: property.id,
    title: property.title,
    description: property.description,
    address: property.address,
    city: property.city,
    region: property.region,
    latitude: property.latitude?.toString(),
    longitude: property.longitude?.toString(),
    facilities: property.facilities,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    price: property.price?.toString(),
    currency: property.currency,
    type: property.type,
    status: property.status,
    ratingAvg: property.ratingAvg?.toString(),
    images: property.propertyImages,
    agent,
    risk,
    reviewsCount: property._count.reviews,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
  };
}

export async function listProperties(query: QueryPropertiesDto) {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const where: Prisma.PropertyWhereInput = {
    deletedAt: null,
    status: 'PUBLISHED',
  };

  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { description: { contains: query.q } },
      { address: { contains: query.q } },
      { city: { contains: query.q } },
    ];
  }
  if (query.type) where.type = { in: [query.type, query.type === 'rent' ? 'arriendo' : 'venta'] };
  if (query.priceMin !== undefined) where.price = { gte: new Prisma.Decimal(query.priceMin) };
  if (query.priceMax !== undefined) {
    where.price = query.priceMin !== undefined
      ? { gte: new Prisma.Decimal(query.priceMin), lte: new Prisma.Decimal(query.priceMax!) }
      : { lte: new Prisma.Decimal(query.priceMax) };
  }
  if (query.bedrooms !== undefined) where.bedrooms = { gte: query.bedrooms };
  if (query.bathrooms !== undefined) where.bathrooms = { gte: query.bathrooms };
  if (query.regionId) {
    const region = await prisma.region.findUnique({ where: { id: query.regionId }, select: { nombre: true } });
    if (region) where.region = region.nombre;
  }
  if (query.comunaId) {
    const comuna = await prisma.comuna.findUnique({ where: { id: query.comunaId }, include: { region: true } });
    if (comuna) where.region = comuna.region.nombre;
  }

  if (query.lat !== undefined && query.lng !== undefined && query.radiusKm !== undefined && query.radiusKm > 0) {
    const latDelta = query.radiusKm / 111;
    const lngDelta = query.radiusKm / (111 * Math.cos((query.lat * Math.PI) / 180));
    where.latitude = { gte: query.lat - latDelta, lte: query.lat + latDelta };
    where.longitude = { gte: query.lng - lngDelta, lte: query.lng + lngDelta };
  }

  const orderBy: Prisma.PropertyOrderByWithRelationInput =
    query.sort === 'price_asc'
      ? { price: 'asc' }
      : query.sort === 'price_desc'
        ? { price: 'desc' }
        : query.sort === 'popular'
          ? { ratingAvg: 'desc' }
          : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        propertyImages: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        riskAssessments: { take: 1, orderBy: { updatedAt: 'desc' }, select: { level: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return {
    items: items.map((p) => ({
      id: p.id,
      title: p.title,
      address: p.address,
      city: p.city,
      region: p.region,
      price: p.price?.toString(),
      currency: p.currency,
      type: p.type,
      status: p.status,
      ratingAvg: p.ratingAvg?.toString(),
      imageUrl: p.propertyImages[0]?.url ?? null,
      riskLevel: p.riskAssessments[0]?.level ?? null,
      reviewsCount: p._count.reviews,
    })),
    total,
    page,
    limit,
  };
}
