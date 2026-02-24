import { prisma } from "@/db/prisma.js";
import type { RoomStatus } from "@/generated/prisma/enums.js";

/* ----------------------------------
   Types
----------------------------------- */

export type RepoListFilters = {
  page: number;
  limit: number;
  unitId?: string;
  maxOccupancy?: number;
  hasAC?: boolean;
  status?: RoomStatus;
  isActive?: boolean;
};

type WhereFilters = {
  unitId?: string;
  maxOccupancy?: number;
  hasAC?: boolean;
  status?: RoomStatus;
  isActive?: boolean;
};

/* ----------------------------------
   Helpers
----------------------------------- */

const buildWhere = (filters: WhereFilters) => ({
  ...(filters.unitId !== undefined && { unitId: filters.unitId }),
  ...(filters.maxOccupancy !== undefined && { maxOccupancy: filters.maxOccupancy }),
  ...(filters.hasAC !== undefined && { hasAC: filters.hasAC }),
  ...(filters.status !== undefined && { status: filters.status }),
  ...(filters.isActive !== undefined && { isActive: filters.isActive }),
});

const roomInclude = {
  amenities: true,
  unit: {
    select: {
      unitNumber: true,
      floor: true,
      property: {
        select: { name: true },
      },
    },
  },
} as const;

/* ----------------------------------
   Repository API
----------------------------------- */

export const createRoom = (data: {
  unitId: string;
  roomNumber: string;
  hasAC: boolean;
  maxOccupancy: number;
  status?: RoomStatus;
  amenities?: {
    createMany: {
      data: { amenityId: string }[];
    };
  };
}) => {
  return prisma.room.create({
    data,
    include: roomInclude,
  });
};

export const findRoomById = (id: string) => {
  return prisma.room.findUnique({
    where: { id },
    include: roomInclude,
  });
};

export const findActiveUnitById = (id: string) => {
  return prisma.unit.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
};

export const updateRoomById = (
  id: string,
  data: Partial<{
    unitId: string;
    roomNumber: string;
    hasAC: boolean;
    maxOccupancy: number;
    status: RoomStatus;
    isActive: boolean;
  }>,
) => {
  return prisma.room.update({
    where: { id },
    data,
    include: roomInclude,
  });
};

export const deleteRoomById = (id: string) => {
  return prisma.room.delete({ where: { id } });
};

export const listRooms = ({
  page,
  limit,
  unitId,
  maxOccupancy,
  hasAC,
  status,
  isActive,
}: RepoListFilters) => {
  const where = buildWhere({
    ...(unitId !== undefined && { unitId }),
    ...(maxOccupancy !== undefined && { maxOccupancy }),
    ...(hasAC !== undefined && { hasAC }),
    ...(status !== undefined && { status }),
    ...(isActive !== undefined && { isActive }),
  });

  return prisma.room.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: roomInclude,
  });
};

export const countRooms = ({
  unitId,
  maxOccupancy,
  hasAC,
  status,
  isActive,
}: Omit<RepoListFilters, "page" | "limit">) => {
  const where = buildWhere({
    ...(unitId !== undefined && { unitId }),
    ...(maxOccupancy !== undefined && { maxOccupancy }),
    ...(hasAC !== undefined && { hasAC }),
    ...(status !== undefined && { status }),
    ...(isActive !== undefined && { isActive }),
  });

  return prisma.room.count({ where });
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

export const replaceRoomAmenities = async (
  roomId: string,
  amenityIds: string[],
) => {
  return prisma.$transaction(async (tx) => {
    await tx.roomAmenity.deleteMany({ where: { roomId } });

    if (amenityIds.length > 0) {
      await tx.roomAmenity.createMany({
        data: amenityIds.map((amenityId) => ({ roomId, amenityId })),
      });
    }

    return tx.room.findUnique({
      where: { id: roomId },
      include: roomInclude,
    });
  });
};
