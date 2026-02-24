import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";

import * as service from "./enquiries.service.js";
import {
  createEnquirySchema,
  updateEnquiryStatusSchema,
} from "./enquiries.schema.js";

export const create = async (req: Request, res: Response) => {
  const parsed = createEnquirySchema.parse(req.body);
  const enquiry = await service.createEnquiry(parsed);
  res.status(201).json({ success: true, data: enquiry });
};

export const getById = async (req: Request<IdParams>, res: Response) => {
  const enquiry = await service.getEnquiryById(req.params.id);
  res.json({ success: true, data: enquiry });
};

export const updateStatus = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateEnquiryStatusSchema.parse(req.body);
  const enquiry = await service.updateEnquiryStatus(req.params.id, parsed);
  res.json({ success: true, data: enquiry });
};

export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const params = {
    page,
    limit,
    ...(typeof req.query.status === "string" && { status: req.query.status }),
  };

  const result = await service.listEnquiries(params);
  res.json({ success: true, data: result });
};
