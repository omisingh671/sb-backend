import { z } from "zod";

const couponBaseSchema = z.object({
  code: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(1).max(100),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  minNights: z.number().int().min(1).optional(),
  minAmount: z.number().positive().optional(),
  validFrom: z.string().refine((v) => !isNaN(Date.parse(v))),
  validTo: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Date.parse(v))),
});

export const createCouponSchema = couponBaseSchema.superRefine((data, ctx) => {
  if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
    ctx.addIssue({
      code: "custom",
      message: "Percentage discount cannot exceed 100%",
      path: ["discountValue"],
    });
  }
});

export const updateCouponSchema = couponBaseSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const validateCouponSchema = z.object({
  code: z.string(),
  checkIn: z.string().refine((v) => !isNaN(Date.parse(v))),
  checkOut: z.string().refine((v) => !isNaN(Date.parse(v))),
  subtotal: z.number().positive(),
});
