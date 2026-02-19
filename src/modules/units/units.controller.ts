import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";
import type { UnitStatus } from "@/generated/prisma/enums.js";

import * as service from "./units.service.js";
import { createUnitSchema, updateUnitSchema } from "./units.schema.js";

/**
 * Create unit
 */
export const create = async (req: Request, res: Response) => {
  const parsed = createUnitSchema.parse(req.body);

  const input = {
    propertyId: parsed.propertyId,
    unitNumber: parsed.unitNumber,
    floor: parsed.floor,
    ...(parsed.status !== undefined && { status: parsed.status }),
    ...(parsed.amenityIds !== undefined && { amenityIds: parsed.amenityIds }),
  };

  const unit = await service.createUnit(input);
  res.status(201).json({ success: true, data: unit });
};

/**
 * Get unit by id
 */
export const getById = async (req: Request<IdParams>, res: Response) => {
  const unit = await service.getUnitById(req.params.id);
  res.json({ success: true, data: unit });
};

/**
 * Update unit
 */
export const update = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateUnitSchema.parse(req.body);

  const input = {
    ...(parsed.unitNumber !== undefined && { unitNumber: parsed.unitNumber }),
    ...(parsed.floor !== undefined && { floor: parsed.floor }),
    ...(parsed.status !== undefined && { status: parsed.status }),
    ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
    ...(parsed.amenityIds !== undefined && { amenityIds: parsed.amenityIds }),
  };

  const unit = await service.updateUnit(req.params.id, input);
  res.json({ success: true, data: unit });
};

/**
 * List units
 */
export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const filters = {
    page,
    limit,

    ...(typeof req.query.propertyId === "string" && {
      propertyId: req.query.propertyId,
    }),

    ...(typeof req.query.status === "string" && {
      status: req.query.status as UnitStatus,
    }),

    ...(req.query.isActive === "true" && { isActive: true }),
    ...(req.query.isActive === "false" && { isActive: false }),
  };

  const result = await service.listUnits(filters);
  res.json({ success: true, data: result });
};
