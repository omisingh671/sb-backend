import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";
import type { RoomStatus } from "@/generated/prisma/enums.js";

import * as service from "./rooms.service.js";
import {
  createRoomSchema,
  updateRoomSchema,
  toggleActiveSchema,
} from "./rooms.schema.js";

/**
 * Create room
 */
export const create = async (req: Request, res: Response) => {
  const parsed = createRoomSchema.parse(req.body);

  const input = {
    unitId: parsed.unitId,
    roomNumber: parsed.roomNumber,
    hasAC: parsed.hasAC,
    maxOccupancy: parsed.maxOccupancy,
    ...(parsed.status !== undefined && { status: parsed.status }),
    ...(parsed.amenityIds !== undefined && { amenityIds: parsed.amenityIds }),
  };

  const room = await service.createRoom(input);
  res.status(201).json({ success: true, data: room });
};

/**
 * Get room by id
 */
export const getById = async (req: Request<IdParams>, res: Response) => {
  const room = await service.getRoomById(req.params.id);
  res.json({ success: true, data: room });
};

/**
 * Update room
 */
export const update = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateRoomSchema.parse(req.body);

  const input = {
    ...(parsed.unitId !== undefined && { unitId: parsed.unitId }),
    ...(parsed.roomNumber !== undefined && { roomNumber: parsed.roomNumber }),
    ...(parsed.hasAC !== undefined && { hasAC: parsed.hasAC }),
    ...(parsed.maxOccupancy !== undefined && { maxOccupancy: parsed.maxOccupancy }),
    ...(parsed.status !== undefined && { status: parsed.status }),
    ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
    ...(parsed.amenityIds !== undefined && { amenityIds: parsed.amenityIds }),
  };

  const room = await service.updateRoom(req.params.id, input);
  res.json({ success: true, data: room });
};

/**
 * Set room active status
 */
export const setActive = async (req: Request<IdParams>, res: Response) => {
  const { isActive } = toggleActiveSchema.parse(req.body);
  const room = await service.setRoomActive(req.params.id, isActive);
  res.json({ success: true, data: room });
};

/**
 * Delete room
 */
export const remove = async (req: Request<IdParams>, res: Response) => {
  await service.deleteRoom(req.params.id);
  res.status(204).send();
};

/**
 * List rooms
 */
export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const filters = {
    page,
    limit,

    ...(typeof req.query.unitId === "string" && {
      unitId: req.query.unitId,
    }),

    ...(typeof req.query.status === "string" && {
      status: req.query.status as RoomStatus,
    }),

    ...(typeof req.query.maxOccupancy === "string" && {
      maxOccupancy: Number(req.query.maxOccupancy),
    }),

    ...(req.query.hasAC === "true" && { hasAC: true }),
    ...(req.query.hasAC === "false" && { hasAC: false }),

    ...(req.query.isActive === "true" && { isActive: true }),
    ...(req.query.isActive === "false" && { isActive: false }),
  };

  const result = await service.listRooms(filters);
  res.json({ success: true, data: result });
};
