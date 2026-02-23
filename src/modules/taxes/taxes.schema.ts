import { z } from "zod";

export const createTaxSchema = z.object({
  name: z.string().min(1).max(100),
  rate: z.number().positive().max(100),
  taxType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  appliesTo: z.enum(["ALL", "ROOM", "UNIT", "CORPORATE"]).default("ALL"),
});

export const updateTaxSchema = createTaxSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });
