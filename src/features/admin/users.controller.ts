/**
 * Express handlers for admin user management.
 **/

import { Request, Response } from "express";
import * as svc from "./users.service";
import type { AuthRequest } from "../../middleware/authMiddleware";

/**
 * GET /api/admin/users
 */
export const listUsersHandler = async (_req: AuthRequest, res: Response) => {
  const users = await svc.listUsers();
  // In a real app you would strip sensitive fields (passwords). For demo, include basic fields.
  const sanitized = users.map((u) => {
    const { password, ...rest } = u as any;
    return rest;
  });
  res.json({ data: sanitized });
};

/**
 * GET /api/admin/users/:id
 */
export const getUserHandler = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = await svc.getUserById(id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const { password, ...rest } = user as any;
  res.json({ data: rest });
};

/**
 * POST /api/admin/users
 */
export const createUserHandler = async (req: AuthRequest, res: Response) => {
  const { email, name, role, password } = req.body ?? {};
  if (!email) return res.status(400).json({ message: "email is required" });

  // Basic payload normalize
  const payload = {
    email,
    name,
    role,
    password,
  };

  const created = await svc.createUser(payload);
  const { password: _pass, ...rest } = created as any;
  res.status(201).json({ data: rest });
};

/**
 * PUT /api/admin/users/:id
 */
export const updateUserHandler = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const patch = req.body ?? {};
  const updated = await svc.updateUser(id, patch);
  if (!updated) return res.status(404).json({ message: "User not found" });
  const { password, ...rest } = updated as any;
  res.json({ data: rest });
};

/**
 * DELETE /api/admin/users/:id
 */
export const deleteUserHandler = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const ok = await svc.deleteUser(id);
  if (!ok) return res.status(404).json({ message: "User not found" });
  res.status(204).send();
};
