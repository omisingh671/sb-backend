/**
 * Spaces controller - Express handlers
 *
 * Routes:
 * GET    /api/spaces         (authenticated)
 * GET    /api/spaces/:id     (authenticated)
 * POST   /api/spaces         (admin)
 * PUT    /api/spaces/:id     (admin)
 * DELETE /api/spaces/:id     (admin)
 **/

import { Request, Response } from "express";
import * as svc from "./spaces.service";
import { AuthRequest } from "../../middleware/authMiddleware";

export const listSpacesHandler = (_req: AuthRequest, res: Response) => {
  const spaces = svc.listSpaces();
  return res.json({ data: spaces });
};

export const getSpaceHandler = (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const space = svc.getSpaceById(id);
  if (!space) return res.status(404).json({ message: "Space not found" });
  return res.json({ data: space });
};

export const createSpaceHandler = (req: AuthRequest, res: Response) => {
  const body = req.body;
  if (!body || !body.title || !body.pricePerNight) {
    return res
      .status(400)
      .json({ message: "Invalid payload: title and pricePerNight required" });
  }
  const payload = {
    title: String(body.title),
    description: body.description ? String(body.description) : undefined,
    pricePerNight: Number(body.pricePerNight),
    capacity: Number(body.capacity ?? 1),
    location: body.location ? String(body.location) : undefined,
  };
  const created = svc.createSpace(payload);
  return res.status(201).json({ data: created });
};

export const updateSpaceHandler = (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const patch = req.body;
  const updated = svc.updateSpace(id, patch);
  if (!updated) return res.status(404).json({ message: "Space not found" });
  return res.json({ data: updated });
};

export const deleteSpaceHandler = (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const ok = svc.deleteSpace(id);
  if (!ok) return res.status(404).json({ message: "Space not found" });
  return res.status(204).send();
};
