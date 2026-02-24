import type { Request, Response, RequestHandler } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import type { IdParams } from "@/common/types/params.js";

import * as service from "./bookings.service.js";
import * as repo from "./bookings.repository.js";
import { createBookingSchema, updateStatusSchema } from "./bookings.schema.js";

export const create = async (req: AuthRequest, res: Response) => {
  const parsed = createBookingSchema.parse(req.body);
  const booking = await service.createBooking(req.user!.userId, parsed);
  res.status(201).json({ success: true, data: booking });
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const result = await repo.findByUser(req.user!.userId, {
    page,
    limit,
    ...(status !== undefined && { status }),
  });
  res.json({ success: true, data: result });
};

export const getById = async (
  req: AuthRequest & Request<IdParams>,
  res: Response,
) => {
  const booking = await repo.findById(req.params.id);
  if (!booking) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found" } });
    return;
  }

  if (
    booking.userId !== req.user!.userId &&
    !["ADMIN", "MANAGER"].includes(req.user!.role)
  ) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
    return;
  }

  res.json({ success: true, data: booking });
};

export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const params = {
    page,
    limit,
    ...(typeof req.query.status === "string" && { status: req.query.status }),
    ...(typeof req.query.bookingType === "string" && {
      bookingType: req.query.bookingType,
    }),
    ...(typeof req.query.search === "string" && { search: req.query.search }),
    ...(typeof req.query.dateFrom === "string" && { dateFrom: req.query.dateFrom }),
    ...(typeof req.query.dateTo === "string" && { dateTo: req.query.dateTo }),
  };

  const result = await repo.findAll(params);
  res.json({ success: true, data: result });
};

export const updateStatus: RequestHandler<IdParams> = async (req, res) => {
  const parsed = updateStatusSchema.parse(req.body);
  const booking = await repo.updateStatus(req.params.id, parsed.status);
  res.json({ success: true, data: booking });
};

export const cancel = async (
  req: AuthRequest & Request<IdParams>,
  res: Response,
) => {
  const booking = await service.cancelBooking(
    req.params.id,
    req.user!.userId,
    req.user!.role,
  );
  res.json({ success: true, data: booking });
};
