import type { Request, Response } from "express";
import { getDashboard } from "./dashboard.service.js";

export const dashboard = async (_req: Request, res: Response) => {
  const data = await getDashboard();
  res.json({ success: true, data });
};
