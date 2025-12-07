import { v4 as uuidv4 } from "uuid";

export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface Space {
  id: string;
  title: string;
  description?: string;
  pricePerNight: number;
  capacity: number;
  location?: string;
}

export interface Booking {
  id: string;
  userId: string;
  spaceId: string;
  from: string; // ISO date
  to: string; // ISO date
  totalPrice: number;
  createdAt: string;
}

/**
 * Refresh token record stored server-side (so we can invalidate / rotate)
 */
export interface RefreshTokenRecord {
  token: string;
  userId: string;
  expiresAt: number; // epoch ms
  createdAt: number;
  replacedByToken?: string | null;
  revoked?: boolean;
}

const now = () => Date.now();

const users: User[] = [
  {
    id: uuidv4(),
    email: "user@demo.com",
    password: "password123",
    name: "Demo User",
    role: "user",
  },
  {
    id: uuidv4(),
    email: "admin@demo.com",
    password: "admin123",
    name: "Demo Admin",
    role: "admin",
  },
];

// sample spaces
const spaces: Space[] = [
  {
    id: uuidv4(),
    title: "Cozy Studio Downtown",
    description: "A cozy studio in the heart of the city.",
    pricePerNight: 45,
    capacity: 2,
    location: "City Center",
  },
  {
    id: uuidv4(),
    title: "Spacious Family House",
    description: "4 bed, 3 bath, ideal for families.",
    pricePerNight: 120,
    capacity: 6,
    location: "Suburbs",
  },
  {
    id: uuidv4(),
    title: "Modern Loft",
    description: "Industrial loft with great light.",
    pricePerNight: 85,
    capacity: 3,
    location: "Arts District",
  },
];

const bookings: Booking[] = [
  {
    id: uuidv4(),
    userId: users[0].id,
    spaceId: spaces[0].id,
    from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    to: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    totalPrice: 45 * 2,
    createdAt: new Date().toISOString(),
  },
];

// refresh token store
const refreshTokens: RefreshTokenRecord[] = [];

export const db = {
  users,
  spaces,
  bookings,
  refreshTokens,
};

/** Helpers */
export const findUserByEmail = (email: string) =>
  users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;

export const findUserById = (id: string) =>
  users.find((u) => u.id === id) ?? null;

export const addRefreshToken = (record: RefreshTokenRecord) => {
  refreshTokens.push(record);
  return record;
};

export const getRefreshToken = (token: string) =>
  refreshTokens.find((r) => r.token === token) ?? null;

export const revokeRefreshToken = (
  token: string,
  replacedBy?: string | null
) => {
  const rec = refreshTokens.find((r) => r.token === token);
  if (!rec) return null;
  rec.revoked = true;
  rec.replacedByToken = replacedBy ?? null;
  return rec;
};

export const removeRefreshToken = (token: string) => {
  const idx = refreshTokens.findIndex((r) => r.token === token);
  if (idx >= 0) refreshTokens.splice(idx, 1);
};

export const removeAllRefreshTokensForUser = (userId: string) => {
  for (let i = refreshTokens.length - 1; i >= 0; i--) {
    if (refreshTokens[i].userId === userId) refreshTokens.splice(i, 1);
  }
};

export const createUser = (payload: Omit<User, "id">) => {
  const u: User = { id: uuidv4(), ...payload };
  users.push(u);
  return u;
};

export const createBooking = (b: Omit<Booking, "id" | "createdAt">) => {
  const booking: Booking = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...b,
  };
  bookings.push(booking);
  return booking;
};
