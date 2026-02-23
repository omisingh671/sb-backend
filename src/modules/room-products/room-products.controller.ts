import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";
import type { RoomProductCategory } from "@/generated/prisma/enums.js";
import type { UpdateRoomProductInput } from "./room-products.inputs.js";

import * as service from "./room-products.service.js";
import { createRoomProductSchema, updateRoomProductSchema } from "./room-products.schema.js";

export const create = async (req: Request, res: Response) => {
  const parsed = createRoomProductSchema.parse(req.body);
  const product = await service.createRoomProduct(parsed);
  res.status(201).json({ success: true, data: product });
};

export const getById = async (req: Request<IdParams>, res: Response) => {
  const product = await service.getRoomProductById(req.params.id);
  res.json({ success: true, data: product });
};

export const update = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateRoomProductSchema.parse(req.body);
  const input: UpdateRoomProductInput = {};
  if (parsed.name !== undefined) input.name = parsed.name;
  if (parsed.occupancy !== undefined) input.occupancy = parsed.occupancy;
  if (parsed.hasAC !== undefined) input.hasAC = parsed.hasAC;
  if (parsed.category !== undefined) input.category = parsed.category;
  const product = await service.updateRoomProduct(req.params.id, input);
  res.json({ success: true, data: product });
};

export const remove = async (req: Request<IdParams>, res: Response) => {
  await service.deleteRoomProduct(req.params.id);
  res.status(204).send();
};

export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const filters = {
    page,
    limit,
    ...(typeof req.query.category === "string" && {
      category: req.query.category as RoomProductCategory,
    }),
    ...(req.query.hasAC === "true" && { hasAC: true }),
    ...(req.query.hasAC === "false" && { hasAC: false }),
  };

  const result = await service.listRoomProducts(filters);
  res.json({ success: true, data: result });
};
