import { Router, type RequestHandler } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./rooms.controller.js";

const router = Router();

// Public routes
router.get("/", controller.list);
router.get("/:id", controller.getById);

// Protected routes
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

router.patch(
  "/:id/active",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.setActive as unknown as RequestHandler,
);

router.delete(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN]),
  controller.remove as unknown as RequestHandler,
);

export default router;
