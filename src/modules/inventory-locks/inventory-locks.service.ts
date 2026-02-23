import crypto from "crypto";
import { prisma } from "@/db/prisma.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { AcquireLockInput } from "./inventory-locks.schema.js";

export const cleanExpiredLocks = async (): Promise<void> => {
  await prisma.inventoryLock.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
};

export const acquireLock = async (
  data: AcquireLockInput,
): Promise<{ sessionKey: string; expiresAt: Date }> => {
  await cleanExpiredLocks();

  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);

  const existing = await prisma.inventoryLock.findFirst({
    where: {
      targetType: data.targetType,
      ...(data.targetType === "ROOM"
        ? { roomId: data.targetId }
        : { unitId: data.targetId }),
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      expiresAt: { gt: new Date() },
    },
  });

  if (existing) {
    throw new HttpError(
      409,
      "ALREADY_LOCKED",
      "Someone is completing a booking — try in a moment",
    );
  }

  const sessionKey = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const lock = await prisma.inventoryLock.create({
    data: {
      sessionKey,
      targetType: data.targetType,
      ...(data.targetType === "ROOM"
        ? { roomId: data.targetId }
        : { unitId: data.targetId }),
      checkIn,
      checkOut,
      expiresAt,
    },
  });

  return { sessionKey: lock.sessionKey, expiresAt: lock.expiresAt };
};

export const releaseLock = async (sessionKey: string): Promise<void> => {
  try {
    await prisma.inventoryLock.delete({ where: { sessionKey } });
  } catch {
    // idempotent — no error if not found
  }
};
