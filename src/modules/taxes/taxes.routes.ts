import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./taxes.controller.js";

const router = Router();

// Public routes
router.get("/", controller.list);
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
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.remove,
);

export default router;
