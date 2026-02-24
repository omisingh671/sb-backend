import { z } from "zod";

export const createBookingSchema = z
  .object({
    sessionKeys: z.array(z.string().uuid()).min(1).max(10),
    occupancyType: z.enum(["single", "double", "unit"]),
    items: z
      .array(
        z.object({
          targetType: z.enum(["ROOM", "UNIT"]),
          roomId: z.string().uuid().optional(),
          unitId: z.string().uuid().optional(),
        }),
      )
      .min(1)
      .max(10),
    checkIn: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }),
    checkOut: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }),
    guests: z.number().int().min(1).max(20),
    couponCode: z.string().optional(),
    notes: z.string().max(500).optional(),
    pricingTier: z.enum(["STANDARD", "CORPORATE", "SEASONAL"]).optional().default("STANDARD"),
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.checkOut) <= Date.parse(data.checkIn)) {
      ctx.addIssue({
        code: "custom",
        message: "checkOut must be after checkIn",
        path: ["checkOut"],
      });
    }
    for (const item of data.items) {
      if (item.targetType === "ROOM" && !item.roomId) {
        ctx.addIssue({
          code: "custom",
          message: "roomId required when targetType=ROOM",
          path: ["items"],
        });
      }
      if (item.targetType === "UNIT" && !item.unitId) {
        ctx.addIssue({
          code: "custom",
          message: "unitId required when targetType=UNIT",
          path: ["items"],
        });
      }
    }
  });

export const updateStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"]),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
