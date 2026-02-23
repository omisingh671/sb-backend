import { z } from "zod";

export const availabilityQuerySchema = z
  .object({
    checkIn: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid check-in date"),
    checkOut: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid check-out date"),
    occupancyType: z.enum(["single", "double", "unit"]),
    guests: z.coerce.number().int().min(1).max(20).optional(),
    hasAC: z
      .string()
      .optional()
      .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
    pricingTier: z.enum(["STANDARD", "CORPORATE"]).optional().default("STANDARD"),
  })
  .superRefine((data, ctx) => {
    const inTs = Date.parse(data.checkIn);
    const outTs = Date.parse(data.checkOut);
    if (!isNaN(inTs) && !isNaN(outTs)) {
      if (outTs <= inTs)
        ctx.addIssue({
          code: "custom",
          message: "Check-out must be after check-in",
          path: ["checkOut"],
        });
      if (inTs < Date.now() - 86400000)
        ctx.addIssue({
          code: "custom",
          message: "Check-in cannot be in the past",
          path: ["checkIn"],
        });
    }
    if (data.occupancyType === "unit" && !data.guests)
      ctx.addIssue({
        code: "custom",
        message: "guests is required for unit search",
        path: ["guests"],
      });
  });

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
