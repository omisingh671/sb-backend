import type { DiscountType } from "@/generated/prisma/enums.js";

export type CreateCouponInput = {
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number;
  minNights?: number;
  minAmount?: number;
  validFrom: string;
  validTo?: string;
};

export type UpdateCouponInput = Partial<CreateCouponInput> & {
  isActive?: boolean;
};

export type ListCouponsFilters = {
  page: number;
  limit: number;
  isActive?: boolean;
};

export type ValidateCouponInput = {
  code: string;
  checkIn: string;
  checkOut: string;
  subtotal: number;
};
