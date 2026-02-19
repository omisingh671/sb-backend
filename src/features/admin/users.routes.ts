/**
 * Mount this router at /api/admin/users (or under /api/admin)
 **/

import { Router } from "express";
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from "./users.controller";
import { authenticate, requireRole } from "../../middleware/authMiddleware";

const router = Router();

// All admin user management endpoints require admin role
router.get("/", authenticate, requireRole("admin"), listUsersHandler);
router.get("/:id", authenticate, requireRole("admin"), getUserHandler);
router.post("/", authenticate, requireRole("admin"), createUserHandler);
router.put("/:id", authenticate, requireRole("admin"), updateUserHandler);
router.delete("/:id", authenticate, requireRole("admin"), deleteUserHandler);

export default router;
