import { Router } from "express";
import { authenticate } from "@/common/middleware/auth.middleware.js";
import { authorize } from "@/common/middleware/role.middleware.js";
import { UserRole } from "@/generated/prisma/enums.js";

import * as controller from "./dashboard.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER]),
  controller.dashboard,
);

export default router;
