/**
 * Bookings routes - mount at /api/bookings
 **/

import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
  listBookingsHandler,
  createBookingHandler,
  getBookingHandler,
} from "./bookings.controller";

const router = Router();

router.get("/", authenticate, listBookingsHandler);
router.post("/", authenticate, createBookingHandler);
router.get("/:id", authenticate, getBookingHandler);

export default router;
