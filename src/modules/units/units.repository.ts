import { prisma } from "@/db/prisma.js";
import type { UnitStatus } from "@/generated/prisma/enums.js";

/* ----------------------------------
   Types
----------------------------------- */

export type RepoListFilters = {
  page: number;
  limit: number;
  propertyId?: string;
  status?: UnitStatus;
  isActive?: boolean;
};

type WhereFilters = {
  propertyId?: string;
  status?: UnitStatus;
  isActive?: boolean;
};

/* ----------------------------------
   Helpers
----------------------------------- */

const buildWhere = (filters: WhereFilters) => ({
  ...(filters.propertyId !== undefined && { propertyId: filters.propertyId }),
  ...(filters.status !== undefined && { status: filters.status }),
  ...(filters.isActive !== undefined && { isActive: filters.isActive }),
});

/* ----------------------------------
   Repository API
----------------------------------- */

export const createUnit = (data: {
  propertyId: string;
  unitNumber: string;
  floor: number;
  status?: UnitStatus;
  amenities?: {
    createMany: {
      data: { amenityId: string }[];
    };
  };
}) => {
  return prisma.unit.create({
    data,
    include: { amenities: true },
  });
};

export const findUnitById = (id: string) => {
  return prisma.unit.findUnique({
    where: { id },
    include: { amenities: true },
  });
};

export const updateUnitById = (
  id: string,
  data: Partial<{
    unitNumber: string;
    floor: number;
    status: UnitStatus;
    isActive: boolean;
  }>,
) => {
  return prisma.unit.update({
    where: { id },
    data,
  });
};

export const listUnits = ({
  page,
  limit,
  propertyId,
  status,
  isActive,
}: RepoListFilters) => {
  const where = buildWhere({
    ...(propertyId !== undefined && { propertyId }),
    ...(status !== undefined && { status }),
    ...(isActive !== undefined && { isActive }),
  });

  return prisma.unit.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { amenities: true },
  });
};

export const countUnits = ({
  propertyId,
  status,
  isActive,
}: Omit<RepoListFilters, "page" | "limit">) => {
  const where = buildWhere({
    ...(propertyId !== undefined && { propertyId }),
    ...(status !== undefined && { status }),
    ...(isActive !== undefined && { isActive }),
  });

  return prisma.unit.count({ where });
};

export const countActiveAmenitiesByIds = (ids: string[]) => {
  if (ids.length === 0) {
    return Promise.resolve(0);
  }

  return prisma.amenity.count({
    where: {
      id: { in: ids },
      isActive: true,
    },
  });
};

export const replaceUnitAmenities = async (
  unitId: string,
  amenityIds: string[],
) => {
  return prisma.$transaction(async (tx) => {
    await tx.unitAmenity.deleteMany({ where: { unitId } });

    if (amenityIds.length > 0) {
      await tx.unitAmenity.createMany({
        data: amenityIds.map((amenityId) => ({ unitId, amenityId })),
      });
    }

    return tx.unit.findUnique({
      where: { id: unitId },
      include: { amenities: true },
    });
  });
};
