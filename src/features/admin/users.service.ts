/**
 * Uses uuid to create new user ids.
 **/

import { v4 as uuidv4 } from "uuid";
import { db } from "../../core/mockDb";
import type { User } from "../../core/mockDb";

export const listUsers = async (): Promise<User[]> => {
  // shallow copy
  return db.users.map((u) => ({ ...u }));
};

export const getUserById = async (id: string): Promise<User | null> => {
  return db.users.find((u) => u.id === id) ?? null;
};

export const createUser = async (payload: Partial<User>): Promise<User> => {
  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    email: String(payload.email ?? "").toLowerCase(),
    name: payload.name ? String(payload.name) : undefined,
    role: (payload.role as User["role"]) ?? "user",
    password: payload.password ? String(payload.password) : "password123",
    createdAt: now,
  } as User;

  db.users.push(user);
  return { ...user };
};

export const updateUser = async (
  id: string,
  patch: Partial<User>
): Promise<User | null> => {
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  const existing = db.users[idx];
  const updated: User = {
    ...existing,
    ...patch,
    // ensure email normalized if present
    email: patch.email ? String(patch.email).toLowerCase() : existing.email,
  };
  db.users[idx] = updated;
  return { ...updated };
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  db.users.splice(idx, 1);
  return true;
};
