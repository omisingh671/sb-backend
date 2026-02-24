import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";

import * as service from "./quotes.service.js";
import { createQuoteSchema, updateQuoteStatusSchema } from "./quotes.schema.js";

export const create = async (req: Request, res: Response) => {
  const parsed = createQuoteSchema.parse(req.body);
  const quote = await service.createQuote(parsed);
  res.status(201).json({ success: true, data: quote });
};

export const getById = async (req: Request<IdParams>, res: Response) => {
  const quote = await service.getQuoteById(req.params.id);
  res.json({ success: true, data: quote });
};

export const updateStatus = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateQuoteStatusSchema.parse(req.body);
  const quote = await service.updateQuoteStatus(req.params.id, parsed);
  res.json({ success: true, data: quote });
};

export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const params = {
    page,
    limit,
    ...(typeof req.query.status === "string" && { status: req.query.status }),
  };

  const result = await service.listQuotes(params);
  res.json({ success: true, data: result });
};
