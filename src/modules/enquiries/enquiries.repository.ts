import { prisma } from "@/db/prisma.js";
import type { CreateEnquiryInput } from "./enquiries.schema.js";

export const create = (data: CreateEnquiryInput) => {
  return prisma.enquiry.create({
    data: {
      name: data.name,
      email: data.email,
      contactNumber: data.contactNumber,
      message: data.message,
      source: data.source ?? null,
      status: "NEW",
    },
  });
};

export const findById = (id: string) => {
  return prisma.enquiry.findUnique({ where: { id } });
};

export const updateStatus = (id: string, status: string) => {
  return prisma.enquiry.update({ where: { id }, data: { status } });
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
    prisma.enquiry.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.enquiry.count({ where }),
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
