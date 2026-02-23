import { z } from "zod";

export const createBlockSchema = z
  .object({
    targetType: z.enum(["ROOM", "UNIT", "PROPERTY"]),
    roomId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    propertyId: z.string().uuid().optional(),
    reason: z.string().max(500).optional(),
    startDate: z.string().refine((v) => !isNaN(Date.parse(v)), {
      message: "startDate must be a valid date string",
    }),
    endDate: z.string().refine((v) => !isNaN(Date.parse(v)), {
      message: "endDate must be a valid date string",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "ROOM" && !data.roomId) {
      ctx.addIssue({
        code: "custom",
        message: "roomId required for ROOM target",
        path: ["roomId"],
      });
    }

    if (data.targetType === "UNIT" && !data.unitId) {
      ctx.addIssue({
        code: "custom",
        message: "unitId required for UNIT target",
        path: ["unitId"],
      });
    }

    if (data.targetType === "PROPERTY" && !data.propertyId) {
      ctx.addIssue({
        code: "custom",
        message: "propertyId required for PROPERTY target",
        path: ["propertyId"],
      });
    }

    if (Date.parse(data.endDate) < Date.parse(data.startDate)) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be on or after start date",
        path: ["endDate"],
      });
    }
  });

export const updateBlockSchema = z
  .object({
    reason: z.string().max(500).optional(),
    startDate: z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), {
        message: "startDate must be a valid date string",
      })
      .optional(),
    endDate: z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), {
        message: "endDate must be a valid date string",
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.startDate !== undefined &&
      data.endDate !== undefined &&
      Date.parse(data.endDate) < Date.parse(data.startDate)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be on or after start date",
        path: ["endDate"],
      });
    }
  });
