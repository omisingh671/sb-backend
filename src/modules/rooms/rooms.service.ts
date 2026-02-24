import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";

import type {
  CreateRoomInput,
  UpdateRoomInput,
  ListRoomsFilters,
} from "./rooms.inputs.js";

import type { RoomDTO } from "./rooms.dto.js";
import * as repo from "./rooms.repository.js";

const mapRoom = (r: any): RoomDTO => ({
  id: r.id,
  unitId: r.unitId,
  unit: {
    unitNumber: r.unit.unitNumber,
    floor: r.unit.floor,
    property: {
      name: r.unit.property.name,
    },
  },
  roomNumber: r.roomNumber,
  hasAC: r.hasAC,
  maxOccupancy: r.maxOccupancy,
  occupancyLabel:
    r.maxOccupancy === 1 ? "Single" : r.maxOccupancy === 2 ? "Double" : "Group",
  status: r.status,
  isActive: r.isActive,
  amenityIds: r.amenities?.map((a: any) => a.amenityId) ?? [],
  createdAt: r.createdAt,
});

export const createRoom = async (data: CreateRoomInput): Promise<RoomDTO> => {
  try {
    const room = await repo.createRoom({
      unitId: data.unitId,
      roomNumber: data.roomNumber,
      hasAC: data.hasAC,
      maxOccupancy: data.maxOccupancy,
      ...(data.status !== undefined && { status: data.status }),
      ...(data.amenityIds !== undefined && {
        amenities: {
          createMany: {
            data: data.amenityIds.map((id) => ({ amenityId: id })),
          },
        },
      }),
    });

    return mapRoom(room);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "ROOM_EXISTS",
        "A room with this number already exists for this unit",
      );
    }

    throw err;
  }
};

export const getRoomById = async (id: string): Promise<RoomDTO> => {
  const room = await repo.findRoomById(id);

  if (!room) {
    throw new HttpError(404, "NOT_FOUND", "Room not found");
  }

  return mapRoom(room);
};

export const updateRoom = async (
  id: string,
  data: UpdateRoomInput,
): Promise<RoomDTO> => {
  try {
    const existing = await repo.findRoomById(id);

    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Room not found");
    }

    if (data.unitId !== undefined) {
      const unit = await repo.findActiveUnitById(data.unitId);

      if (!unit) {
        throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
      }

      if (!unit.isActive) {
        throw new HttpError(400, "UNIT_INACTIVE", "Unit is not active");
      }
    }

    let room;

    if (data.amenityIds !== undefined) {
      if (data.amenityIds.length > 0) {
        const validCount = await repo.countActiveAmenitiesByIds(data.amenityIds);

        if (validCount !== data.amenityIds.length) {
          throw new HttpError(
            400,
            "INVALID_AMENITY",
            "One or more amenities are invalid or inactive",
          );
        }
      }

      await repo.updateRoomById(id, {
        ...(data.unitId !== undefined && { unitId: data.unitId }),
        ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber }),
        ...(data.hasAC !== undefined && { hasAC: data.hasAC }),
        ...(data.maxOccupancy !== undefined && { maxOccupancy: data.maxOccupancy }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      });

      room = await repo.replaceRoomAmenities(id, data.amenityIds);
    } else {
      room = await repo.updateRoomById(id, {
        ...(data.unitId !== undefined && { unitId: data.unitId }),
        ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber }),
        ...(data.hasAC !== undefined && { hasAC: data.hasAC }),
        ...(data.maxOccupancy !== undefined && { maxOccupancy: data.maxOccupancy }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      });
    }

    if (!room) {
      throw new HttpError(404, "NOT_FOUND", "Room not found");
    }

    return mapRoom(room);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "ROOM_EXISTS",
        "A room with this number already exists for this unit",
      );
    }

    throw err;
  }
};

export const setRoomActive = async (
  id: string,
  isActive: boolean,
): Promise<RoomDTO> => {
  const existing = await repo.findRoomById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Room not found");
  }

  const room = await repo.updateRoomById(id, { isActive });

  return mapRoom(room);
};

export const deleteRoom = async (id: string): Promise<void> => {
  const existing = await repo.findRoomById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Room not found");
  }

  await repo.deleteRoomById(id);
};

export const listRooms = async ({
  page,
  limit,
  unitId,
  maxOccupancy,
  hasAC,
  status,
  isActive,
}: ListRoomsFilters) => {
  const [items, total] = await Promise.all([
    repo.listRooms({
      page,
      limit,
      ...(unitId !== undefined && { unitId }),
      ...(maxOccupancy !== undefined && { maxOccupancy }),
      ...(hasAC !== undefined && { hasAC }),
      ...(status !== undefined && { status }),
      ...(isActive !== undefined && { isActive }),
    }),
    repo.countRooms({
      ...(unitId !== undefined && { unitId }),
      ...(maxOccupancy !== undefined && { maxOccupancy }),
      ...(hasAC !== undefined && { hasAC }),
      ...(status !== undefined && { status }),
      ...(isActive !== undefined && { isActive }),
    }),
  ]);

  return {
    items: items.map(mapRoom),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
