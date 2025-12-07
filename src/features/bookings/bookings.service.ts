/**
 * Bookings service - operates on mockDb bookings
 **/

import { db, Booking } from "../../core/mockDb";

export const listBookingsForUser = (userId: string): Booking[] => {
  return db.bookings.filter((b) => b.userId === userId);
};

export const listAllBookings = (): Booking[] => {
  return db.bookings;
};

export const createBooking = (
  payload: Omit<Booking, "id" | "createdAt">
): Booking => {
  const booking = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...payload,
  };
  db.bookings.push(booking);
  return booking;
};

export const getBookingById = (id: string) => {
  return db.bookings.find((b) => b.id === id) ?? null;
};
