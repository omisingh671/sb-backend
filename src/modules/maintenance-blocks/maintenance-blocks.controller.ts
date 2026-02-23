import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import type { IdParams } from "@/common/types/params.js";

import * as service from "./maintenance-blocks.service.js";
import { createBlockSchema, updateBlockSchema } from "./maintenance-blocks.schema.js";

/**
 * List maintenance blocks
 */
export const list = async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const filters = {
    page,
    limit,

    ...(typeof req.query.targetType === "string" && {
      targetType: req.query.targetType as "ROOM" | "UNIT" | "PROPERTY",
    }),

    ...(req.query.upcoming === "true" && { upcoming: true }),
    ...(req.query.upcoming === "false" && { upcoming: false }),
  };

  const result = await service.listBlocks(filters);
  res.json({ success: true, data: result });
};

/**
 * Get maintenance block by id
 */
export const getById = async (req: AuthRequest<IdParams>, res: Response) => {
  const block = await service.getBlockById(req.params.id);
  res.json({ success: true, data: block });
};

/**
 * Create maintenance block
 */
export const create = async (req: AuthRequest, res: Response) => {
  const parsed = createBlockSchema.parse(req.body);
  const createdBy = req.user!.userId;

  const input = {
    targetType: parsed.targetType,
    ...(parsed.roomId !== undefined && { roomId: parsed.roomId }),
    ...(parsed.unitId !== undefined && { unitId: parsed.unitId }),
    ...(parsed.propertyId !== undefined && { propertyId: parsed.propertyId }),
    ...(parsed.reason !== undefined && { reason: parsed.reason }),
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    createdBy,
  };

  const block = await service.createBlock(input);
  res.status(201).json({ success: true, data: block });
};

/**
 * Update maintenance block
 */
export const update = async (req: AuthRequest<IdParams>, res: Response) => {
  const parsed = updateBlockSchema.parse(req.body);

  const input = {
    ...(parsed.reason !== undefined && { reason: parsed.reason }),
    ...(parsed.startDate !== undefined && { startDate: parsed.startDate }),
    ...(parsed.endDate !== undefined && { endDate: parsed.endDate }),
  };

  const block = await service.updateBlock(req.params.id, input);
  res.json({ success: true, data: block });
};

/**
 * Delete maintenance block
 */
export const remove = async (req: AuthRequest<IdParams>, res: Response) => {
  await service.deleteBlock(req.params.id);
  res.status(204).send();
};
