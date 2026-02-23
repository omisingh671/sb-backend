import { z } from "zod";

export const acquireLockSchema = z.object({
  targetType: z.enum(["ROOM", "UNIT"]),
  targetId: z.string().uuid(),
  checkIn: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }),
  checkOut: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }),
});

export type AcquireLockInput = z.infer<typeof acquireLockSchema>;
