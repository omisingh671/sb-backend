import { z } from "zod";
import { RoomStatus } from "@/generated/prisma/enums.js";

export const RoomStatusSchema = z.nativeEnum(RoomStatus);

export const createRoomSchema = z.object({
  unitId: z.string().uuid(),
  roomNumber: z.string().min(1).max(10),
  hasAC: z.boolean(),
  maxOccupancy: z.number().int().min(1).max(10),
  status: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    RoomStatusSchema.optional(),
  ),
  amenityIds: z.array(z.string().uuid()).optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const toggleActiveSchema = z.object({
  isActive: z.boolean(),
});
