import { prisma } from "@/db/prisma.js";
import { HttpError } from "@/common/errors/http-error.js";
import { selectRate } from "@/modules/availability/availability.service.js";
import { validateCoupon } from "@/modules/coupons/coupons.service.js";
import {
  cleanExpiredLocks,
  releaseLock,
} from "@/modules/inventory-locks/inventory-locks.service.js";
import * as pricingRepo from "@/modules/room-pricing/room-pricing.repository.js";
import * as repo from "./bookings.repository.js";
import type { CreateBookingInput } from "./bookings.schema.js";

const calculateNights = (checkIn: Date, checkOut: Date): number =>
  Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);

export const createBooking = async (userId: string, input: CreateBookingInput) => {
  // Step 0: clean expired locks
  await cleanExpiredLocks();

  // Step 1: validate all session locks exist and haven't expired
  const now = new Date();
  const locks = await Promise.all(
    input.sessionKeys.map((key) =>
      prisma.inventoryLock.findUnique({ where: { sessionKey: key } }),
    ),
  );
  const hasExpired = locks.some((lock) => !lock || lock.expiresAt < now);
  if (hasExpired) {
    throw new HttpError(
      400,
      "LOCK_EXPIRED",
      "Your reservation expired. Please start again.",
    );
  }

  // Step 2: calculate nights
  const checkIn = new Date(input.checkIn);
  const checkOut = new Date(input.checkOut);
  const nights = calculateNights(checkIn, checkOut);
  const pricingTier = input.pricingTier ?? "STANDARD";

  // Step 3: determine bookingType
  // noUncheckedIndexedAccess: items has min(1) from schema so [0] is safe
  const firstItem = input.items[0]!;
  let bookingType: string;
  if (nights >= 7) {
    bookingType = "LONG_STAY";
  } else if (input.items.length > 1) {
    bookingType = "MULTI_ROOM";
  } else if (firstItem.targetType === "UNIT") {
    bookingType = "UNIT";
  } else {
    bookingType = "ROOM";
  }

  // Step 4: process each item
  const bookingItems: repo.BookingItemData[] = [];

  for (const item of input.items) {
    if (item.targetType === "ROOM") {
      const room = await prisma.room.findUnique({
        where: { id: item.roomId! },
        include: { unit: { include: { property: true } } },
      });

      if (!room || !room.isActive) {
        throw new HttpError(404, "NOT_FOUND", "Room not found or inactive");
      }

      const rates = await pricingRepo.findActiveRatesForRoom(room.id, checkIn);
      const { rate, requiresQuote } = selectRate(rates, nights, pricingTier);

      if (requiresQuote) {
        throw new HttpError(400, "REQUIRES_QUOTE", "This stay requires a custom quote");
      }
      if (!rate) {
        throw new HttpError(
          400,
          "NO_PRICING",
          "No pricing available for this room and dates",
        );
      }

      const hasConflict = await repo.hasConflictForRoom(
        room.id,
        room.unitId,
        checkIn,
        checkOut,
      );
      if (hasConflict) {
        throw new HttpError(409, "CONFLICT", "This room is no longer available");
      }

      const pricePerNight = Number(rate.price);
      const subtotal = pricePerNight * nights;

      bookingItems.push({
        targetType: "ROOM",
        roomId: room.id,
        pricingId: (rate as any).id,
        rateType: rate.rateType,
        pricePerNight,
        nights,
        subtotal,
        label: `Room ${room.roomNumber} — Unit ${room.unit.unitNumber}, ${room.unit.property.name}`,
      });
    } else {
      // UNIT
      const unit = await prisma.unit.findUnique({
        where: { id: item.unitId! },
        include: { property: true, rooms: true },
      });

      if (!unit || !unit.isActive) {
        throw new HttpError(404, "NOT_FOUND", "Unit not found or inactive");
      }

      const rates = await pricingRepo.findActiveRatesForUnit(unit.id, checkIn);
      const { rate, requiresQuote } = selectRate(rates, nights, pricingTier);

      if (requiresQuote) {
        throw new HttpError(400, "REQUIRES_QUOTE", "This stay requires a custom quote");
      }
      if (!rate) {
        throw new HttpError(
          400,
          "NO_PRICING",
          "No pricing available for this unit and dates",
        );
      }

      const allRoomIds = unit.rooms.map((r) => r.id);
      const hasConflict = await repo.hasConflictForUnit(
        unit.id,
        allRoomIds,
        checkIn,
        checkOut,
      );
      if (hasConflict) {
        throw new HttpError(409, "CONFLICT", "This unit is no longer available");
      }

      const pricePerNight = Number(rate.price);
      const subtotal = pricePerNight * nights;

      bookingItems.push({
        targetType: "UNIT",
        unitId: unit.id,
        pricingId: (rate as any).id,
        rateType: rate.rateType,
        pricePerNight,
        nights,
        subtotal,
        label: `Unit ${unit.unitNumber} — ${unit.property.name} (Whole Apartment)`,
      });
    }
  }

  // Step 5: booking subtotal
  const bookingSubtotal = bookingItems.reduce((sum, i) => sum + i.subtotal, 0);

  // Step 6: coupon
  let discountAmount = 0;
  let couponId: string | undefined;
  let couponCode: string | undefined;

  if (input.couponCode) {
    const result = await validateCoupon(input.couponCode, nights, bookingSubtotal);
    discountAmount = result.discountAmount;
    couponId = result.couponId;
    couponCode = result.code;
  }

  // Step 7: discounted total
  const discountedTotal = bookingSubtotal - discountAmount;

  // Step 8: taxes
  const taxes = await prisma.tax.findMany({ where: { isActive: true } });
  let taxAmount = 0;
  for (const tax of taxes) {
    const appliesToBooking = tax.appliesTo === "ALL" || tax.appliesTo === bookingType;
    if (!appliesToBooking) continue;

    if (tax.taxType === "PERCENTAGE") {
      taxAmount += discountedTotal * (Number(tax.rate) / 100);
    } else {
      taxAmount += Number(tax.rate);
    }
  }

  // Step 9: total amount
  const totalAmount = discountedTotal + taxAmount;

  // Step 10: user details
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  // Step 11: booking reference
  const bookingRef = await repo.generateBookingRef(new Date().getFullYear());

  // Step 12: create in transaction — use conditional spread for optional fields
  const booking = await repo.create({
    bookingRef,
    userId,
    bookingType,
    guestName: user.fullName,
    guestEmail: user.email,
    guestPhone: user.contactNumber ?? "",
    checkIn,
    checkOut,
    nights,
    guests: input.guests,
    subtotal: bookingSubtotal,
    taxAmount,
    discountAmount,
    totalAmount,
    ...(couponId !== undefined && { couponId }),
    ...(couponCode !== undefined && { couponCode }),
    ...(input.notes !== undefined && { notes: input.notes }),
    items: bookingItems,
  });

  // Step 13: release all locks
  await Promise.all(input.sessionKeys.map((key) => releaseLock(key)));

  // Step 14: increment coupon usage
  if (couponId) {
    await repo.incrementCouponUsage(couponId);
  }

  return booking;
};

export const cancelBooking = async (
  id: string,
  requestingUserId: string,
  role: string,
) => {
  const booking = await repo.findById(id);
  if (!booking) {
    throw new HttpError(404, "NOT_FOUND", "Booking not found");
  }

  if (booking.userId !== requestingUserId && !["ADMIN", "MANAGER"].includes(role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new HttpError(
      400,
      "CANNOT_CANCEL",
      "Booking cannot be cancelled in its current status",
    );
  }

  return repo.updateStatus(id, "CANCELLED");
};
