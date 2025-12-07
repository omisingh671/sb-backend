/**
 * Bookings controller
 *
 * Routes:
 * GET    /api/bookings        (authenticated) - user: own bookings, admin: all bookings
 * POST   /api/bookings        (authenticated) - create booking for current user
 * GET    /api/bookings/:id    (authenticated) - owner or admin
 **/

import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as svc from "./bookings.service";

export const listBookingsHandler = (req: AuthRequest, res: Response) => {
  const userPayload = req.userPayload!;
  if (userPayload.role === "admin") {
    const all = svc.listAllBookings();
    return res.json({ data: all });
  }
  const userId = userPayload.sub;
  const list = svc.listBookingsForUser(userId);
  return res.json({ data: list });
};

export const createBookingHandler = (req: AuthRequest, res: Response) => {
  const userPayload = req.userPayload!;
  const userId = userPayload.sub;
  const { spaceId, from, to, totalPrice } = req.body ?? {};

  if (!spaceId || !from || !to || !totalPrice) {
    return res
      .status(400)
      .json({
        message: "Missing booking fields: spaceId, from, to, totalPrice",
      });
  }

  const booking = svc.createBooking({
    userId,
    spaceId: String(spaceId),
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    totalPrice: Number(totalPrice),
  });

  return res.status(201).json({ data: booking });
};

export const getBookingHandler = (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const booking = svc.getBookingById(id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const userPayload = req.userPayload!;
  if (userPayload.role !== "admin" && booking.userId !== userPayload.sub) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return res.json({ data: booking });
};
