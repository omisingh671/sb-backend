import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";
import type { RateType, PricingTier } from "@/generated/prisma/enums.js";

import * as service from "./room-pricing.service.js";
import {
  createRoomPricingSchema,
  updateRoomPricingSchema,
} from "./room-pricing.schema.js";

export const create = async (req: Request, res: Response) => {
  const parsed = createRoomPricingSchema.parse(req.body);
  const pricing = await service.createRoomPricing(parsed);
  res.status(201).json({ success: true, data: pricing });
};

export const getById = async (req: Request<IdParams>, res: Response) => {
  const pricing = await service.getRoomPricingById(req.params.id);
  res.json({ success: true, data: pricing });
};

export const update = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateRoomPricingSchema.parse(req.body);
  const pricing = await service.updateRoomPricing(req.params.id, parsed);
  res.json({ success: true, data: pricing });
};

export const remove = async (req: Request<IdParams>, res: Response) => {
  await service.deleteRoomPricing(req.params.id);
  res.status(204).send();
};

export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const filters = {
    page,
    limit,
    ...(typeof req.query.productId === "string" && { productId: req.query.productId }),
    ...(typeof req.query.roomId === "string" && { roomId: req.query.roomId }),
    ...(typeof req.query.unitId === "string" && { unitId: req.query.unitId }),
    ...(typeof req.query.rateType === "string" && {
      rateType: req.query.rateType as RateType,
    }),
    ...(typeof req.query.pricingTier === "string" && {
      pricingTier: req.query.pricingTier as PricingTier,
    }),
  };

  const result = await service.listRoomPricing(filters);
  res.json({ success: true, data: result });
};

export const activeRatesForRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params as { roomId: string };
  const checkIn = typeof req.query.checkIn === "string" ? req.query.checkIn : new Date().toISOString();
  const rates = await service.getActiveRatesForRoom(roomId, checkIn);
  res.json({ success: true, data: rates });
};

export const activeRatesForUnit = async (req: Request, res: Response) => {
  const { unitId } = req.params as { unitId: string };
  const checkIn = typeof req.query.checkIn === "string" ? req.query.checkIn : new Date().toISOString();
  const rates = await service.getActiveRatesForUnit(unitId, checkIn);
  res.json({ success: true, data: rates });
};
