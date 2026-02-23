import { prisma } from "@/db/prisma.js";
import { UserRole } from "@/generated/prisma/enums.js";

export const getDashboard = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [
    bookingStats,
    todayCheckIns,
    occupancy,
    recentBookings,
    enquiryStats,
    quoteStats,
    userStats,
  ] = await Promise.all([
    // bookingStats: total, by status, totalRevenue
    (async () => {
      const [total, byStatus, revenue] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
        prisma.booking.aggregate({
          where: { status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] } },
          _sum: { totalAmount: true },
        }),
      ]);
      return {
        total,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
        totalRevenue: Number(revenue._sum.totalAmount ?? 0),
      };
    })(),

    // todayCheckIns: bookings with checkIn=today and status=CONFIRMED
    prisma.booking.count({
      where: {
        checkIn: { gte: today, lt: tomorrow },
        status: "CONFIRMED",
      },
    }),

    // occupancy
    (async () => {
      const [totalRooms, totalUnits, occupiedRooms, occupiedUnits] = await Promise.all([
        prisma.room.count({ where: { isActive: true } }),
        prisma.unit.count({ where: { isActive: true } }),
        prisma.bookingItem.count({
          where: {
            targetType: "ROOM",
            booking: {
              status: { in: ["CONFIRMED", "CHECKED_IN"] },
              checkIn: { lte: today },
              checkOut: { gt: today },
            },
          },
        }),
        prisma.bookingItem.count({
          where: {
            targetType: "UNIT",
            booking: {
              status: { in: ["CONFIRMED", "CHECKED_IN"] },
              checkIn: { lte: today },
              checkOut: { gt: today },
            },
          },
        }),
      ]);
      return { totalRooms, totalUnits, occupiedRooms, occupiedUnits };
    })(),

    // recentBookings: last 5 with user.fullName
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true } },
      },
    }),

    // enquiryStats: total and newCount
    (async () => {
      const [total, newCount] = await Promise.all([
        prisma.enquiry.count(),
        prisma.enquiry.count({ where: { status: "NEW" } }),
      ]);
      return { total, newCount };
    })(),

    // quoteStats: total and pendingCount
    (async () => {
      const [total, pendingCount] = await Promise.all([
        prisma.quoteInquiry.count(),
        prisma.quoteInquiry.count({ where: { status: "PENDING" } }),
      ]);
      return { total, pendingCount };
    })(),

    // userStats: total GUEST users, new this month
    (async () => {
      const [total, newThisMonth] = await Promise.all([
        prisma.user.count({ where: { role: UserRole.GUEST } }),
        prisma.user.count({
          where: {
            role: UserRole.GUEST,
            createdAt: { gte: firstOfMonth, lt: nextMonth },
          },
        }),
      ]);
      return { total, newThisMonth };
    })(),
  ]);

  return {
    bookingStats,
    todayCheckIns,
    occupancy,
    recentBookings,
    enquiryStats,
    quoteStats,
    userStats,
  };
};
