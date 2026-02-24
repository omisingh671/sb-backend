import { z } from "zod";

const validDate = (v: string) => !isNaN(Date.parse(v));

export const createQuoteSchema = z
  .object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    contactNumber: z.string().min(6).max(20).regex(/^[0-9]+$/),
    company: z.string().max(100).optional(),
    guests: z.number().int().min(1).max(50),
    bookingPreference: z.enum(["ROOM", "UNIT", "MULTI_ROOM"]),
    checkIn: z.string().refine(validDate, { message: "Invalid date" }),
    checkOut: z.string().refine(validDate, { message: "Invalid date" }),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const nights = Math.round(
      (Date.parse(data.checkOut) - Date.parse(data.checkIn)) / 86400000,
    );
    if (nights < 30) {
      ctx.addIssue({
        code: "custom",
        message: "Quote requests are for stays of 30+ nights",
        path: ["checkOut"],
      });
    }
  });

export const updateQuoteStatusSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "QUOTED", "ACCEPTED", "REJECTED"]),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;
