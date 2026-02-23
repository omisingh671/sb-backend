import { prisma } from "@/db/prisma.js";
import { HttpError } from "@/common/errors/http-error.js";

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN"];

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED"],
  CHECKED_IN: ["CHECKED_OUT"],
};

const bookingInclude = {
  items: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      contactNumber: true,
    },
  },
};

/* ------------------------------------------------------------------ */

export const countBookingsThisYear = (year: number): Promise<number> => {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return prisma.booking.count({
    where: { createdAt: { gte: start, lt: end } },
  });
};

export const generateBookingRef = async (year: number): Promise<string> => {
  const count = await countBookingsThisYear(year);
  return `SCH-${year}-${String(count + 1).padStart(4, "0")}`;
};

/* ------------------------------------------------------------------ */

export const findById = (id: string) => {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
};

/* ------------------------------------------------------------------ */

export type FindAllParams = {
  page: number;
  limit: number;
  status?: string;
  bookingType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const findAll = async (params: FindAllParams) => {
  const { page, limit, status, bookingType, search, dateFrom, dateTo } = params;

  const where: Record<string, unknown> = {
    ...(status && { status }),
    ...(bookingType && { bookingType }),
    ...(dateFrom && { checkIn: { gte: new Date(dateFrom) } }),
    ...(dateTo && { checkOut: { lte: new Date(dateTo) } }),
    ...(search && {
      OR: [
        { guestName: { contains: search } },
        { guestEmail: { contains: search } },
        { bookingRef: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/* ------------------------------------------------------------------ */

export type FindByUserParams = {
  page: number;
  limit: number;
  status?: string;
};

export const findByUser = async (userId: string, params: FindByUserParams) => {
  const { page, limit, status } = params;
  const where: Record<string, unknown> = {
    userId,
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/* ------------------------------------------------------------------ */

export type BookingItemData = {
  targetType: string;
  roomId?: string;
  unitId?: string;
  pricingId?: string;
  rateType: string;
  pricePerNight: number;
  nights: number;
  subtotal: number;
  label: string;
};

export type CreateBookingData = {
  bookingRef: string;
  userId: string;
  bookingType: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  guests: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  couponId?: string;
  couponCode?: string;
  notes?: string;
  items: BookingItemData[];
};

export const create = async (data: CreateBookingData) => {
  const { items, ...bookingData } = data;

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        bookingRef: bookingData.bookingRef,
        userId: bookingData.userId,
        bookingType: bookingData.bookingType as any,
        guestName: bookingData.guestName,
        guestEmail: bookingData.guestEmail,
        guestPhone: bookingData.guestPhone,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        nights: bookingData.nights,
        guests: bookingData.guests,
        subtotal: bookingData.subtotal,
        taxAmount: bookingData.taxAmount,
        discountAmount: bookingData.discountAmount,
        totalAmount: bookingData.totalAmount,
        couponId: bookingData.couponId ?? null,
        couponCode: bookingData.couponCode ?? null,
        notes: bookingData.notes ?? null,
        status: "PENDING",
      },
    });

    await tx.bookingItem.createMany({
      data: items.map((item) => ({
        bookingId: booking.id,
        targetType: item.targetType,
        roomId: item.roomId ?? null,
        unitId: item.unitId ?? null,
        pricingId: item.pricingId ?? null,
        rateType: item.rateType,
        pricePerNight: item.pricePerNight,
        nights: item.nights,
        subtotal: item.subtotal,
        label: item.label,
      })),
    });

    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude,
    });
  });
};

/* ------------------------------------------------------------------ */

export const hasConflictForRoom = async (
  roomId: string,
  unitId: string | null,
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> => {
  const conflict = await prisma.bookingItem.findFirst({
    where: {
      OR: [
        { targetType: "ROOM", roomId },
        ...(unitId ? [{ targetType: "UNIT", unitId }] : []),
      ],
      booking: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    },
  });
  return conflict !== null;
};

export const hasConflictForUnit = async (
  unitId: string,
  allRoomIds: string[],
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> => {
  const conflict = await prisma.bookingItem.findFirst({
    where: {
      OR: [
        { targetType: "UNIT", unitId },
        ...(allRoomIds.length > 0
          ? [{ targetType: "ROOM", roomId: { in: allRoomIds } }]
          : []),
      ],
      booking: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    },
  });
  return conflict !== null;
};

/* ------------------------------------------------------------------ */

export const updateStatus = async (id: string, status: string) => {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    throw new HttpError(404, "NOT_FOUND", "Booking not found");
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[booking.status];
  if (!allowedTransitions || !allowedTransitions.includes(status)) {
    throw new HttpError(
      400,
      "INVALID_STATUS_TRANSITION",
      `Cannot transition from ${booking.status} to ${status}`,
    );
  }

  return prisma.booking.update({
    where: { id },
    data: { status },
    include: bookingInclude,
  });
};

/* ------------------------------------------------------------------ */

export const incrementCouponUsage = async (couponId: string): Promise<void> => {
  await prisma.coupon.update({
    where: { id: couponId },
    data: { usedCount: { increment: 1 } },
  });
};
