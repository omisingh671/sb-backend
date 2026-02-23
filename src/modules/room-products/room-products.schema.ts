import { z } from "zod";

export const createRoomProductSchema = z.object({
  name: z.string().min(1).max(100),
  occupancy: z.number().int().min(1).max(10),
  hasAC: z.boolean(),
  category: z.enum(["NIGHTLY", "LONG_STAY", "CORPORATE"]),
});

export const updateRoomProductSchema = createRoomProductSchema.partial();
