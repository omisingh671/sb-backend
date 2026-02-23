import { prisma } from "@/db/prisma.js";
import type { CreateTaxInput, UpdateTaxInput, ListTaxesFilters } from "./taxes.inputs.js";

type WhereFilters = {
  isActive?: boolean;
  appliesTo?: string;
};

const buildWhere = (filters: WhereFilters) => ({
  ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  ...(filters.appliesTo !== undefined && { appliesTo: filters.appliesTo }),
});

export const createTax = (data: CreateTaxInput) => {
  return prisma.tax.create({ data });
};

export const findTaxById = (id: string) => {
  return prisma.tax.findUnique({ where: { id } });
};

export const updateTaxById = (id: string, data: UpdateTaxInput) => {
  return prisma.tax.update({ where: { id }, data });
};

export const deleteTaxById = (id: string) => {
  return prisma.tax.delete({ where: { id } });
};

export const listTaxes = ({ page, limit, isActive, appliesTo }: ListTaxesFilters) => {
  const where = buildWhere({
    ...(isActive !== undefined && { isActive }),
    ...(appliesTo !== undefined && { appliesTo }),
  });

  return prisma.tax.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
};

export const countTaxes = ({ isActive, appliesTo }: Omit<ListTaxesFilters, "page" | "limit">) => {
  const where = buildWhere({
    ...(isActive !== undefined && { isActive }),
    ...(appliesTo !== undefined && { appliesTo }),
  });

  return prisma.tax.count({ where });
};
