import { Router } from "express";
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
} from "./auth.controller";

const router = Router();

router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.get("/me", meHandler);

export default router;
