import { Router, type RequestHandler } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./quotes.controller.js";

const router = Router();

router.post("/", controller.create); // PUBLIC

router.get(
  "/",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.list,
);
router.get(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.getById as unknown as RequestHandler,
);
router.patch(
  "/:id/status",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.updateStatus as unknown as RequestHandler,
);

export default router;
