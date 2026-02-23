import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";

import * as service from "./coupons.service.js";
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./coupons.schema.js";

export const create = async (req: Request, res: Response) => {
  const parsed = createCouponSchema.parse(req.body);
  const coupon = await service.createCoupon(parsed as any);
  res.status(201).json({ success: true, data: coupon });
};

export const getById = async (req: Request<IdParams>, res: Response) => {
  const coupon = await service.getCouponById(req.params.id);
  res.json({ success: true, data: coupon });
};

export const update = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateCouponSchema.parse(req.body);
  const coupon = await service.updateCoupon(req.params.id, parsed as any);
  res.json({ success: true, data: coupon });
};

export const remove = async (req: Request<IdParams>, res: Response) => {
  await service.deleteCoupon(req.params.id);
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
  };

  const result = await service.listCoupons(filters);
  res.json({ success: true, data: result });
};

export const validate = async (req: Request, res: Response) => {
  const parsed = validateCouponSchema.parse(req.body);

  const checkIn = new Date(parsed.checkIn);
  const checkOut = new Date(parsed.checkOut);
  const nights = Math.max(
    1,
    Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const result = await service.validateCoupon(parsed.code, nights, parsed.subtotal);
  res.json({ success: true, data: result });
};
