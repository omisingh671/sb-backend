import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";

import * as service from "./taxes.service.js";
import { createTaxSchema, updateTaxSchema } from "./taxes.schema.js";

export const create = async (req: Request, res: Response) => {
  const parsed = createTaxSchema.parse(req.body);
  const tax = await service.createTax(parsed);
  res.status(201).json({ success: true, data: tax });
};

export const getById = async (req: Request<IdParams>, res: Response) => {
  const tax = await service.getTaxById(req.params.id);
  res.json({ success: true, data: tax });
};

export const update = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateTaxSchema.parse(req.body);
  const tax = await service.updateTax(req.params.id, parsed);
  res.json({ success: true, data: tax });
};

export const remove = async (req: Request<IdParams>, res: Response) => {
  await service.deleteTax(req.params.id);
  res.status(204).send();
};

export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const filters = {
    page,
    limit,
    ...(req.query.isActive === "true" && { isActive: true }),
    ...(req.query.isActive === "false" && { isActive: false }),
    ...(typeof req.query.appliesTo === "string" && { appliesTo: req.query.appliesTo }),
  };

  const result = await service.listTaxes(filters);
  res.json({ success: true, data: result });
};
