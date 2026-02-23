import { Router } from "express";
import * as controller from "./inventory-locks.controller.js";

const router = Router();

router.post("/", controller.acquire);
router.delete("/:sessionKey", controller.release);

export default router;
