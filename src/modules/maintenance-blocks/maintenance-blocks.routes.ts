import { Router, type RequestHandler } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./maintenance-blocks.controller.js";

const router = Router();

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
  authorize([UserRole.ADMIN]),
  controller.remove as unknown as RequestHandler,
);

export default router;
