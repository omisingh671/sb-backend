/**
 * Spaces routes - mount at /api/spaces
 **/

import { Router } from "express";
import {
  listSpacesHandler,
  getSpaceHandler,
  createSpaceHandler,
  updateSpaceHandler,
  deleteSpaceHandler,
} from "./spaces.controller";
import { authenticate, requireRole } from "../../middleware/authMiddleware";

const router = Router();

// All routes require authentication per spec
router.get("/", authenticate, listSpacesHandler);
router.get("/:id", authenticate, getSpaceHandler);

// Admin-only management endpoints
router.post("/", authenticate, requireRole("admin"), createSpaceHandler);
router.put("/:id", authenticate, requireRole("admin"), updateSpaceHandler);
router.delete("/:id", authenticate, requireRole("admin"), deleteSpaceHandler);

export default router;
