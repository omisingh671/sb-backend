import { Router } from "express";
import * as controller from "./availability.controller.js";

const router = Router();

// Public — no authentication required
router.get("/", controller.getAvailability);

export default router;
