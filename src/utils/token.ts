import jwt, { SignOptions, Secret, JwtPayload } from "jsonwebtoken";
import {
  db,
  addRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
} from "../core/mockDb";
import { User } from "../core/mockDb";

const ACCESS_TOKEN_EXP: SignOptions["expiresIn"] =
  (process.env.ACCESS_TOKEN_EXP as SignOptions["expiresIn"]) || "15m"; // e.g. '15m'
const REFRESH_TOKEN_EXP: SignOptions["expiresIn"] =
  (process.env.REFRESH_TOKEN_EXP as SignOptions["expiresIn"]) || "7d"; // e.g. '7d'

const JWT_ACCESS_SECRET: Secret =
  (process.env.JWT_ACCESS_SECRET as Secret) || "access-secret-demo";
const JWT_REFRESH_SECRET: Secret =
  (process.env.JWT_REFRESH_SECRET as Secret) || "refresh-secret-demo";

export interface AccessTokenPayload extends JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  tokenId: string; // to link to server-side record
}

/**
 * Sign access token
 */
export const signAccessToken = (user: User): string => {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXP,
  });

  return token;
};

/**
 * Sign refresh token.
 */
export const signRefreshToken = (user: User): string => {
  const tokenId = `${user.id}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 9)}`;

  const expiresInSeconds = parseDurationToSeconds(String(REFRESH_TOKEN_EXP));
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  const record = addRefreshToken({
    token: tokenId,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt,
    revoked: false,
    replacedByToken: null,
  });

  const payload: RefreshTokenPayload = {
    sub: user.id,
    tokenId: record.token,
  };

  const jwtToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXP,
  });

  return jwtToken;
};

/**
 * Verify access token (throws if invalid)
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, JWT_ACCESS_SECRET) as AccessTokenPayload;
  return payload;
};

/**
 * Verify refresh token and ensure it exists server-side and is not revoked/expired.
 *
 * Returns { user, record } when valid, throws otherwise.
 */
export const verifyRefreshToken = (token: string) => {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;

  if (!payload || !payload.tokenId) {
    throw new Error("Invalid refresh token payload");
  }

  const record = getRefreshToken(payload.tokenId);
  if (!record) {
    throw new Error("Refresh token not found");
  }
  if (record.revoked) {
    throw new Error("Refresh token revoked");
  }
  if (Date.now() > record.expiresAt) {
    throw new Error("Refresh token expired");
  }

  const user = db.users.find((u) => u.id === record.userId);
  if (!user) {
    throw new Error("User not found for refresh token");
  }

  return { user, record };
};

/**
 * Helper to parse durations like "7d", "15m", "3600s"
 * Returns seconds.
 */
function parseDurationToSeconds(v: string): number {
  const match = /^(\d+)(s|m|h|d)?$/.exec(v);
  if (!match) return 0;
  const val = Number(match[1]);
  const unit = match[2] ?? "s";
  switch (unit) {
    case "s":
      return val;
    case "m":
      return val * 60;
    case "h":
      return val * 60 * 60;
    case "d":
      return val * 60 * 60 * 24;
    default:
      return val;
  }
}

/**
 * Rotate refresh token: revoke old, create new record + jwt
 */
export const rotateRefreshToken = (
  oldRecordTokenId: string,
  user: User
): string => {
  revokeRefreshToken(oldRecordTokenId);
  const newJwt = signRefreshToken(user);
  return newJwt;
};

/**
 * Invalidate refresh token (server-side)
 */
export const invalidateRefreshToken = (tokenId: string): void => {
  revokeRefreshToken(tokenId);
};
