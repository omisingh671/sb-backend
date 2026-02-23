import { z } from "zod";

export const createEnquirySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  contactNumber: z.string().min(6).max(20).regex(/^[0-9]+$/),
  message: z.string().min(10).max(1000),
  source: z.string().optional(),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(["NEW", "READ", "REPLIED", "CLOSED"]),
});

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type UpdateEnquiryStatusInput = z.infer<typeof updateEnquiryStatusSchema>;
