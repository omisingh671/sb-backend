import { z } from "zod";
import { UnitStatus } from "@/generated/prisma/enums.js";

export const UnitStatusSchema = z.nativeEnum(UnitStatus);

export const createUnitSchema = z.object({
  propertyId: z.string().uuid(),
  unitNumber: z.string().min(1),
  floor: z.number().int(),
  status: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    UnitStatusSchema.optional(),
  ),
  amenityIds: z.array(z.string().uuid()).optional(),
});

export const updateUnitSchema = z.object({
  unitNumber: z.string().min(1).optional(),
  floor: z.number().int().optional(),
  status: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    UnitStatusSchema.optional(),
  ),
  isActive: z.boolean().optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});
