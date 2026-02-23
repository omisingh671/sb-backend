import { z } from "zod";

const roomPricingBaseSchema = z.object({
  productId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  rateType: z.enum(["NIGHTLY", "WEEKLY", "MONTHLY"]).default("NIGHTLY"),
  pricingTier: z.enum(["STANDARD", "CORPORATE", "SEASONAL"]).default("STANDARD"),
  minNights: z.number().int().min(1).default(1),
  maxNights: z.number().int().optional(),
  price: z.number().positive(),
  taxInclusive: z.boolean().default(false),
  validFrom: z.string().refine((v) => !isNaN(Date.parse(v))),
  validTo: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Date.parse(v))),
});

export const createRoomPricingSchema = roomPricingBaseSchema.superRefine((data, ctx) => {
  if (!data.roomId && !data.unitId) {
    ctx.addIssue({
      code: "custom",
      message: "Provide either roomId or unitId",
      path: ["roomId"],
    });
  }
  if (data.roomId && data.unitId) {
    ctx.addIssue({
      code: "custom",
      message: "Provide only one of roomId or unitId",
      path: ["unitId"],
    });
  }
  if (data.validTo && Date.parse(data.validTo) <= Date.parse(data.validFrom)) {
    ctx.addIssue({
      code: "custom",
      message: "validTo must be after validFrom",
      path: ["validTo"],
    });
  }
  if (data.maxNights && data.maxNights < data.minNights) {
    ctx.addIssue({
      code: "custom",
      message: "maxNights must be >= minNights",
      path: ["maxNights"],
    });
  }
});

export const updateRoomPricingSchema = roomPricingBaseSchema.partial();
