import { Request, Response } from "express";
import { login as svcLogin, refresh as svcRefresh } from "./auth.service";
import { verifyAccessToken } from "../../utils/token";
import { db } from "../../core/mockDb";

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? "refresh_token";
const COOKIE_MAX_AGE = (() => {
  // default 7 days in ms
  const exp = process.env.REFRESH_TOKEN_EXP ?? "7d";
  const match = /^(\d+)(s|m|h|d)?$/.exec(exp);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = Number(match[1]);
  const unit = match[2] ?? "d";
  switch (unit) {
    case "s":
      return val * 1000;
    case "m":
      return val * 60 * 1000;
    case "h":
      return val * 60 * 60 * 1000;
    case "d":
      return val * 24 * 60 * 60 * 1000;
    default:
      return val * 1000;
  }
})();

const isProd = process.env.NODE_ENV === "production";

export const loginHandler = (req: Request, res: Response) => {
  console.log("LOGIN REQ HEADERS:", req.headers);
  console.log("LOGIN REQ BODY:", req.body);

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const { accessToken, refreshJwt, user } = svcLogin(email, password);

    // set refresh cookie (HttpOnly)
    res.cookie(REFRESH_COOKIE_NAME, refreshJwt, {
      httpOnly: true,
      secure: isProd, // set true in production (HTTPS)
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/api/auth", // restrict cookie to auth routes (optional)
    });

    return res.json({ accessToken, user });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return res.status(status).json({ message: err?.message ?? "Login failed" });
  }
};

export const refreshHandler = (req: Request, res: Response) => {
  const refreshJwt = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshJwt) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const {
      accessToken,
      refreshJwt: newRefreshJwt,
      user,
    } = svcRefresh(refreshJwt);

    // rotate cookie with new refresh token
    res.cookie(REFRESH_COOKIE_NAME, newRefreshJwt, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/api/auth",
    });

    return res.json({ accessToken, user });
  } catch (err: any) {
    const status = err?.status ?? 401;
    return res
      .status(status)
      .json({ message: err?.message ?? "Unable to refresh token" });
  }
};

export const logoutHandler = (req: Request, res: Response) => {
  const refreshJwt = req.cookies?.[REFRESH_COOKIE_NAME];
  // revoke server-side refresh token if present
  if (refreshJwt) {
    try {
      // attempt to verify and revoke server-side (if service exposes)
      // For simplicity: we'll remove cookie and client will be logged out
    } catch (e) {
      // ignore
    }
  }

  // clear cookie
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
  });

  return res.json({ message: "Logged out" });
};

/**
 * GET /auth/me
 * - requires valid access token in Authorization header
 */
export const meHandler = (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Missing Authorization header" });
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ message: "Invalid Authorization header" });
  const token = parts[1];
  try {
    const payload = verifyAccessToken(token);
    const user = db.users.find((u) => u.id === (payload as any).sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    const returnedUser = { ...user };
    delete (returnedUser as any).password;
    return res.json({ user: returnedUser });
  } catch (err: any) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};
