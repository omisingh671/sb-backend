import type { Request, Response } from "express";
import { availabilityQuerySchema } from "./availability.schema.js";
import * as service from "./availability.service.js";

/**
 * GET /availability
 * Public — no authentication required
 */
export const getAvailability = async (req: Request, res: Response) => {
  const params = availabilityQuerySchema.parse(req.query);
  const result = await service.searchAvailability(params);
  res.json({ success: true, data: result });
};
