import type { Request, Response } from "express";
import * as service from "./inventory-locks.service.js";
import { acquireLockSchema } from "./inventory-locks.schema.js";

export const acquire = async (req: Request, res: Response) => {
  const parsed = acquireLockSchema.parse(req.body);
  const result = await service.acquireLock(parsed);
  res.status(201).json({ success: true, data: result });
};

export const release = async (
  req: Request<{ sessionKey: string }>,
  res: Response,
) => {
  await service.releaseLock(req.params.sessionKey);
  res.status(204).send();
};
