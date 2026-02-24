import { prisma } from "@/db/prisma.js";
import type { CreateQuoteInput } from "./quotes.schema.js";

export const create = (data: CreateQuoteInput) => {
  return prisma.quoteInquiry.create({
    data: {
      name: data.name,
      email: data.email,
      contactNumber: data.contactNumber,
      company: data.company ?? null,
      guests: data.guests,
      bookingPreference: data.bookingPreference,
      checkIn: new Date(data.checkIn),
      checkOut: new Date(data.checkOut),
      notes: data.notes ?? null,
      status: "PENDING",
    },
  });
};

export const findById = (id: string) => {
  return prisma.quoteInquiry.findUnique({ where: { id } });
};

export const updateStatus = (id: string, status: string) => {
  return prisma.quoteInquiry.update({ where: { id }, data: { status } });
};

export type FindAllParams = {
  page: number;
  limit: number;
  status?: string;
};

export const findAll = async (params: FindAllParams) => {
  const { page, limit, status } = params;
  const where = { ...(status && { status }) };

  const [items, total] = await Promise.all([
    prisma.quoteInquiry.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.quoteInquiry.count({ where }),
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
