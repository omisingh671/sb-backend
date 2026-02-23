import { Router, type RequestHandler } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./room-pricing.controller.js";

const router = Router();

// Public routes
router.get("/", controller.list);
router.get("/active/room/:roomId", controller.activeRatesForRoom);
router.get("/active/unit/:unitId", controller.activeRatesForUnit);
router.get("/:id", controller.getById);

// Admin/Manager routes
router.post(
  "/",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.create,
);

router.patch(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.update as unknown as RequestHandler,
);

router.delete(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.remove as unknown as RequestHandler,
);

export default router;
