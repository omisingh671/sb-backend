import { prisma } from "@/db/prisma.js";
import type {
  CreateRoomPricingInput,
  UpdateRoomPricingInput,
  ListRoomPricingFilters,
} from "./room-pricing.inputs.js";
import type { RateType, PricingTier } from "@/generated/prisma/enums.js";

const detailInclude = {
  product: true,
  room: {
    include: {
      unit: {
        include: { property: true },
      },
    },
  },
  unit: {
    include: { property: true },
  },
};

type WhereFilters = {
  productId?: string;
  roomId?: string;
  unitId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
};

const buildWhere = (filters: WhereFilters) => ({
  ...(filters.productId !== undefined && { productId: filters.productId }),
  ...(filters.roomId !== undefined && { roomId: filters.roomId }),
  ...(filters.unitId !== undefined && { unitId: filters.unitId }),
  ...(filters.rateType !== undefined && { rateType: filters.rateType }),
  ...(filters.pricingTier !== undefined && { pricingTier: filters.pricingTier }),
});

export const findAll = ({
  page,
  limit,
  productId,
  roomId,
  unitId,
  rateType,
  pricingTier,
}: ListRoomPricingFilters) => {
  const where = buildWhere({
    ...(productId !== undefined && { productId }),
    ...(roomId !== undefined && { roomId }),
    ...(unitId !== undefined && { unitId }),
    ...(rateType !== undefined && { rateType }),
    ...(pricingTier !== undefined && { pricingTier }),
  });

  return prisma.roomPricing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: detailInclude,
  });
};

export const countAll = ({
  productId,
  roomId,
  unitId,
  rateType,
  pricingTier,
}: Omit<ListRoomPricingFilters, "page" | "limit">) => {
  const where = buildWhere({
    ...(productId !== undefined && { productId }),
    ...(roomId !== undefined && { roomId }),
    ...(unitId !== undefined && { unitId }),
    ...(rateType !== undefined && { rateType }),
    ...(pricingTier !== undefined && { pricingTier }),
  });

  return prisma.roomPricing.count({ where });
};

export const findById = (id: string) => {
  return prisma.roomPricing.findUnique({
    where: { id },
    include: detailInclude,
  });
};

export const findActiveRatesForRoom = (roomId: string, checkInDate: Date) => {
  return prisma.roomPricing.findMany({
    where: {
      roomId,
      validFrom: { lte: checkInDate },
      OR: [{ validTo: null }, { validTo: { gte: checkInDate } }],
    },
    include: detailInclude,
  });
};

export const findActiveRatesForUnit = (unitId: string, checkInDate: Date) => {
  return prisma.roomPricing.findMany({
    where: {
      unitId,
      validFrom: { lte: checkInDate },
      OR: [{ validTo: null }, { validTo: { gte: checkInDate } }],
    },
    include: detailInclude,
  });
};

export const create = (data: CreateRoomPricingInput) => {
  return prisma.roomPricing.create({
    data: {
      productId: data.productId,
      ...(data.roomId !== undefined && { roomId: data.roomId }),
      ...(data.unitId !== undefined && { unitId: data.unitId }),
      rateType: data.rateType,
      pricingTier: data.pricingTier,
      minNights: data.minNights,
      ...(data.maxNights !== undefined && { maxNights: data.maxNights }),
      price: data.price,
      taxInclusive: data.taxInclusive,
      validFrom: new Date(data.validFrom),
      ...(data.validTo !== undefined && { validTo: new Date(data.validTo) }),
    },
    include: detailInclude,
  });
};

export const update = (id: string, data: UpdateRoomPricingInput) => {
  return prisma.roomPricing.update({
    where: { id },
    data: {
      ...(data.productId !== undefined && { productId: data.productId }),
      ...(data.roomId !== undefined && { roomId: data.roomId }),
      ...(data.unitId !== undefined && { unitId: data.unitId }),
      ...(data.rateType !== undefined && { rateType: data.rateType }),
      ...(data.pricingTier !== undefined && { pricingTier: data.pricingTier }),
      ...(data.minNights !== undefined && { minNights: data.minNights }),
      ...(data.maxNights !== undefined && { maxNights: data.maxNights }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.taxInclusive !== undefined && { taxInclusive: data.taxInclusive }),
      ...(data.validFrom !== undefined && { validFrom: new Date(data.validFrom) }),
      ...(data.validTo !== undefined && { validTo: new Date(data.validTo) }),
    },
    include: detailInclude,
  });
};

export const deleteById = (id: string) => {
  return prisma.roomPricing.delete({ where: { id } });
};
