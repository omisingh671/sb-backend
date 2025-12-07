/**
 * Spaces service - thin layer over mockDb
 **/

import { db, Space } from "../../core/mockDb";

export const listSpaces = (): Space[] => {
  return db.spaces;
};

export const getSpaceById = (id: string): Space | null => {
  return db.spaces.find((s) => s.id === id) ?? null;
};

export const createSpace = (payload: Omit<Space, "id">): Space => {
  const newSpace = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...payload,
  };
  db.spaces.push(newSpace);
  return newSpace;
};

export const updateSpace = (
  id: string,
  patch: Partial<Omit<Space, "id">>
): Space | null => {
  const idx = db.spaces.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  db.spaces[idx] = { ...db.spaces[idx], ...patch };
  return db.spaces[idx];
};

export const deleteSpace = (id: string): boolean => {
  const idx = db.spaces.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  db.spaces.splice(idx, 1);
  return true;
};
