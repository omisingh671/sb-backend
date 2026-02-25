import { z } from "zod";

// Refinement-free base — safe for .partial() in Zod v4
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
  validFrom: z.string(),
  validTo: z.string().optional(),
});

export const createRoomPricingSchema = roomPricingBaseSchema.superRefine((data, ctx) => {
  if (isNaN(Date.parse(data.validFrom))) {
    ctx.addIssue({ code: "custom", message: "Invalid date", path: ["validFrom"] });
  }
  if (data.validTo && isNaN(Date.parse(data.validTo))) {
    ctx.addIssue({ code: "custom", message: "Invalid date", path: ["validTo"] });
  }
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

export const updateRoomPricingSchema = roomPricingBaseSchema.partial().superRefine((data, ctx) => {
  if (data.validFrom && isNaN(Date.parse(data.validFrom))) {
    ctx.addIssue({ code: "custom", message: "Invalid date", path: ["validFrom"] });
  }
  if (data.validTo && isNaN(Date.parse(data.validTo))) {
    ctx.addIssue({ code: "custom", message: "Invalid date", path: ["validTo"] });
  }
  if (data.roomId && data.unitId) {
    ctx.addIssue({
      code: "custom",
      message: "Provide only one of roomId or unitId",
      path: ["unitId"],
    });
  }
  if (data.validTo && data.validFrom && Date.parse(data.validTo) <= Date.parse(data.validFrom)) {
    ctx.addIssue({
      code: "custom",
      message: "validTo must be after validFrom",
      path: ["validTo"],
    });
  }
  if (data.maxNights !== undefined && data.minNights !== undefined && data.maxNights < data.minNights) {
    ctx.addIssue({
      code: "custom",
      message: "maxNights must be >= minNights",
      path: ["maxNights"],
    });
  }
});
