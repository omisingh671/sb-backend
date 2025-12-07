import {
  findUserByEmail,
  db,
  getRefreshToken,
  removeRefreshToken,
  revokeRefreshToken,
} from "../../core/mockDb";

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
} from "../../utils/token";

import { User } from "../../core/mockDb";

export interface LoginResult {
  accessToken: string;
  refreshJwt: string; // JWT (server sets in cookie)
  user: Omit<User, "password">;
}

export const login = (email: string, password: string): LoginResult => {
  const user = findUserByEmail(email);
  if (!user) {
    throw { status: 401, message: "Invalid credentials" };
  }

  if (user.password !== password) {
    throw { status: 401, message: "Invalid credentials" };
  }

  const accessToken = signAccessToken(user);
  const refreshJwt = signRefreshToken(user);

  const returnedUser = { ...user };
  delete (returnedUser as any).password;

  return {
    accessToken,
    refreshJwt,
    user: returnedUser,
  };
};

/**
 * Refresh flow:
 * - verify refresh JWT
 * - create new access token
 * - rotate refresh token (optionally) -> issue new refresh JWT
 **/

export const refresh = (refreshJwt: string) => {
  try {
    const { user, record } = verifyRefreshToken(refreshJwt);

    const accessToken = signAccessToken(user);
    const newRefreshJwt = rotateRefreshToken(record.token, user);

    const returnedUser = { ...user };
    delete (returnedUser as any).password;

    return {
      accessToken,
      refreshJwt: newRefreshJwt,
      user: returnedUser,
    };
  } catch (err) {
    // map errors to 401
    throw { status: 401, message: "Invalid or expired refresh token" };
  }
};

export const logout = (refreshJwt?: string) => {
  if (!refreshJwt) return;
  try {
    const payload = verifyRefreshToken(refreshJwt); // will throw if invalid
    // revoke
    revokeRefreshToken(
      (payload as any).record?.token ?? (payload as any).tokenId ?? ""
    );
  } catch (e) {
    // ignore if invalid
  }
};
