import { prisma } from "@/db/prisma.js";
import type { CreateCouponInput, UpdateCouponInput, ListCouponsFilters } from "./coupons.inputs.js";

export const createCoupon = (data: CreateCouponInput) => {
  return prisma.coupon.create({
    data: {
      code: data.code,
      name: data.name,
      discountType: data.discountType,
      discountValue: data.discountValue,
      ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
      ...(data.minNights !== undefined && { minNights: data.minNights }),
      ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
      validFrom: new Date(data.validFrom),
      ...(data.validTo !== undefined && { validTo: new Date(data.validTo) }),
    },
  });
};

export const findCouponById = (id: string) => {
  return prisma.coupon.findUnique({ where: { id } });
};

export const findCouponByCode = (code: string) => {
  return prisma.coupon.findUnique({ where: { code } });
};

export const updateCouponById = (id: string, data: UpdateCouponInput) => {
  return prisma.coupon.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.discountType !== undefined && { discountType: data.discountType }),
      ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
      ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
      ...(data.minNights !== undefined && { minNights: data.minNights }),
      ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
      ...(data.validFrom !== undefined && { validFrom: new Date(data.validFrom) }),
      ...(data.validTo !== undefined && { validTo: new Date(data.validTo) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
};

export const deleteCouponById = (id: string) => {
  return prisma.coupon.delete({ where: { id } });
};

export const listCoupons = ({ page, limit, isActive }: ListCouponsFilters) => {
  const where = {
    ...(isActive !== undefined && { isActive }),
  };

  return prisma.coupon.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
};

export const countCoupons = ({ isActive }: Omit<ListCouponsFilters, "page" | "limit">) => {
  const where = {
    ...(isActive !== undefined && { isActive }),
  };

  return prisma.coupon.count({ where });
};
