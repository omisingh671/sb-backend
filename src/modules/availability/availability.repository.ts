import { prisma } from "@/db/prisma.js";
import { RoomStatus, UnitStatus } from "@/generated/prisma/enums.js";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

export const calculateNights = (checkIn: Date, checkOut: Date): number =>
  Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);

/* ------------------------------------------------------------------
   Conflict detection — Bookings
------------------------------------------------------------------ */

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN"];

export const getBookedRoomIds = async (
  checkIn: Date,
  checkOut: Date,
): Promise<string[]> => {
  // Part 1: ROOM-level booking items overlapping the date range
  const roomItems = await prisma.bookingItem.findMany({
    where: {
      targetType: "ROOM",
      booking: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    },
    select: { roomId: true },
  });

  // Part 2: UNIT-level bookings → collect all room IDs from those units
  const unitItems = await prisma.bookingItem.findMany({
    where: {
      targetType: "UNIT",
      booking: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    },
    select: { unitId: true },
  });

  const bookedUnitIds = unitItems
    .map((i) => i.unitId)
    .filter((id): id is string => id !== null);

  const roomsInBookedUnits =
    bookedUnitIds.length > 0
      ? await prisma.room.findMany({
          where: { unitId: { in: bookedUnitIds } },
          select: { id: true },
        })
      : [];

  return [
    ...roomItems.map((i) => i.roomId).filter((id): id is string => id !== null),
    ...roomsInBookedUnits.map((r) => r.id),
  ];
};

export const getBookedUnitIds = async (
  checkIn: Date,
  checkOut: Date,
): Promise<string[]> => {
  // Part 1: Direct UNIT-level bookings overlapping the date range
  const unitItems = await prisma.bookingItem.findMany({
    where: {
      targetType: "UNIT",
      booking: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    },
    select: { unitId: true },
  });

  // Part 2: ROOM-level bookings → find the units those rooms belong to
  const roomItems = await prisma.bookingItem.findMany({
    where: {
      targetType: "ROOM",
      booking: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    },
    select: { roomId: true },
  });

  const bookedRoomIds = roomItems
    .map((i) => i.roomId)
    .filter((id): id is string => id !== null);

  const rooms =
    bookedRoomIds.length > 0
      ? await prisma.room.findMany({
          where: { id: { in: bookedRoomIds } },
          select: { unitId: true },
        })
      : [];

  return [
    ...unitItems.map((i) => i.unitId).filter((id): id is string => id !== null),
    ...rooms.map((r) => r.unitId),
  ];
};

/* ------------------------------------------------------------------
   Conflict detection — Inventory Locks
------------------------------------------------------------------ */

export const getLockedRoomIds = async (
  checkIn: Date,
  checkOut: Date,
): Promise<string[]> => {
  const locks = await prisma.inventoryLock.findMany({
    where: {
      targetType: "ROOM",
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      expiresAt: { gt: new Date() },
    },
    select: { roomId: true },
  });

  return locks.map((l) => l.roomId).filter((id): id is string => id !== null);
};

export const getLockedUnitIds = async (
  checkIn: Date,
  checkOut: Date,
): Promise<string[]> => {
  const locks = await prisma.inventoryLock.findMany({
    where: {
      targetType: "UNIT",
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      expiresAt: { gt: new Date() },
    },
    select: { unitId: true },
  });

  return locks.map((l) => l.unitId).filter((id): id is string => id !== null);
};

/* ------------------------------------------------------------------
   Conflict detection — Maintenance Blocks
------------------------------------------------------------------ */

export const getMaintenanceRoomIds = async (
  checkIn: Date,
  checkOut: Date,
): Promise<string[]> => {
  // Part 1: Direct ROOM-level maintenance blocks
  const roomBlocks = await prisma.maintenanceBlock.findMany({
    where: {
      targetType: "ROOM",
      startDate: { lte: checkOut },
      endDate: { gte: checkIn },
    },
    select: { roomId: true },
  });

  // Part 2: PROPERTY-level blocks → get all rooms in those properties
  const propertyBlocks = await prisma.maintenanceBlock.findMany({
    where: {
      targetType: "PROPERTY",
      startDate: { lte: checkOut },
      endDate: { gte: checkIn },
    },
    select: { propertyId: true },
  });

  const propertyIds = propertyBlocks
    .map((b) => b.propertyId)
    .filter((id): id is string => id !== null);

  const roomsInProperties =
    propertyIds.length > 0
      ? await prisma.room.findMany({
          where: { unit: { propertyId: { in: propertyIds } } },
          select: { id: true },
        })
      : [];

  return [
    ...roomBlocks.map((b) => b.roomId).filter((id): id is string => id !== null),
    ...roomsInProperties.map((r) => r.id),
  ];
};

export const getMaintenanceUnitIds = async (
  checkIn: Date,
  checkOut: Date,
): Promise<string[]> => {
  // Part 1: Direct UNIT-level maintenance blocks
  const unitBlocks = await prisma.maintenanceBlock.findMany({
    where: {
      targetType: "UNIT",
      startDate: { lte: checkOut },
      endDate: { gte: checkIn },
    },
    select: { unitId: true },
  });

  // Part 2: PROPERTY-level blocks → get all units in those properties
  const propertyBlocks = await prisma.maintenanceBlock.findMany({
    where: {
      targetType: "PROPERTY",
      startDate: { lte: checkOut },
      endDate: { gte: checkIn },
    },
    select: { propertyId: true },
  });

  const propertyIds = propertyBlocks
    .map((b) => b.propertyId)
    .filter((id): id is string => id !== null);

  const unitsInProperties =
    propertyIds.length > 0
      ? await prisma.unit.findMany({
          where: { propertyId: { in: propertyIds } },
          select: { id: true },
        })
      : [];

  return [
    ...unitBlocks.map((b) => b.unitId).filter((id): id is string => id !== null),
    ...unitsInProperties.map((u) => u.id),
  ];
};

/* ------------------------------------------------------------------
   Inventory search
------------------------------------------------------------------ */

export const searchAvailableRooms = (params: {
  maxOccupancy?: number;
  hasAC?: boolean;
  excludeRoomIds: string[];
  excludeUnitIds: string[];
  checkIn: Date;
}) => {
  return prisma.room.findMany({
    where: {
      isActive: true,
      status: RoomStatus.ACTIVE,
      ...(params.maxOccupancy !== undefined && {
        maxOccupancy: params.maxOccupancy,
      }),
      ...(params.hasAC !== undefined && { hasAC: params.hasAC }),
      ...(params.excludeRoomIds.length > 0 && {
        id: { notIn: params.excludeRoomIds },
      }),
      ...(params.excludeUnitIds.length > 0 && {
        unitId: { notIn: params.excludeUnitIds },
      }),
      unit: {
        isActive: true,
        status: UnitStatus.ACTIVE,
        property: { isActive: true },
      },
    },
    include: {
      unit: {
        include: { property: true },
      },
      amenities: {
        include: { amenity: true },
      },
      pricing: {
        where: {
          validFrom: { lte: params.checkIn },
          OR: [{ validTo: null }, { validTo: { gte: params.checkIn } }],
        },
      },
    },
  });
};

export const searchAvailableUnits = async (params: {
  guests: number;
  excludeUnitIds: string[];
  checkIn: Date;
}) => {
  const units = await prisma.unit.findMany({
    where: {
      isActive: true,
      status: UnitStatus.ACTIVE,
      ...(params.excludeUnitIds.length > 0 && {
        id: { notIn: params.excludeUnitIds },
      }),
      property: { isActive: true },
    },
    include: {
      property: true,
      rooms: {
        include: {
          pricing: {
            where: {
              validFrom: { lte: params.checkIn },
              OR: [{ validTo: null }, { validTo: { gte: params.checkIn } }],
            },
          },
        },
      },
      amenities: {
        include: { amenity: true },
      },
      pricing: {
        where: {
          validFrom: { lte: params.checkIn },
          OR: [{ validTo: null }, { validTo: { gte: params.checkIn } }],
        },
      },
    },
  });

  // Post-filter: keep only units where total room capacity >= guests
  return units.filter(
    (unit) => unit.rooms.reduce((sum, room) => sum + room.maxOccupancy, 0) >= params.guests,
  );
};

export const searchAllAvailableUnits = (params: {
  excludeUnitIds: string[];
  checkIn: Date;
}) => {
  return prisma.unit.findMany({
    where: {
      isActive: true,
      status: UnitStatus.ACTIVE,
      ...(params.excludeUnitIds.length > 0 && {
        id: { notIn: params.excludeUnitIds },
      }),
      property: { isActive: true },
    },
    include: {
      property: true,
      rooms: {
        include: {
          pricing: {
            where: {
              validFrom: { lte: params.checkIn },
              OR: [{ validTo: null }, { validTo: { gte: params.checkIn } }],
            },
          },
        },
      },
      amenities: {
        include: { amenity: true },
      },
      pricing: {
        where: {
          validFrom: { lte: params.checkIn },
          OR: [{ validTo: null }, { validTo: { gte: params.checkIn } }],
        },
      },
    },
  });
};

/* ------------------------------------------------------------------
   Taxes
------------------------------------------------------------------ */

export const getActiveTaxes = () => {
  return prisma.tax.findMany({
    where: { isActive: true },
    select: { name: true, rate: true, taxType: true },
  });
};
