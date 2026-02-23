import { Router, type RequestHandler } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./coupons.controller.js";

const router = Router();

// Public route — must be before /:id
router.post("/validate", controller.validate);

// Public read routes
router.get("/", controller.list);
router.get("/:id", controller.getById);

// Admin/Manager write routes
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
