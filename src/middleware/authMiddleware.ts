/**
 * - authenticate: verifies access token in Authorization header and sets req.userPayload
 * - requireRole: ensures user has one of required roles
 * - app.get("/protected", authenticate, (req,res) => ...)
 * - app.get("/admin", authenticate, requireRole("admin"), ...)
 **/

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token";
import { db } from "../core/mockDb";

export interface AuthRequest extends Request {
  userPayload?: {
    sub: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Missing Authorization header" });
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ message: "Invalid Authorization header" });
  const token = parts[1];
  try {
    const payload = verifyAccessToken(token);
    // attach payload to request
    req.userPayload = payload as any;
    // optionally check user exists
    const user = db.users.find((u) => u.id === (payload as any).sub);
    if (!user) return res.status(401).json({ message: "User not found" });
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * requireRole(...roles)
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userPayload)
      return res.status(401).json({ message: "Not authenticated" });
    const role = req.userPayload.role;
    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden - insufficient role" });
    }
    next();
  };
};
