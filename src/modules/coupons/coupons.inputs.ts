import type { DiscountType } from "@/generated/prisma/enums.js";

export type CreateCouponInput = {
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number | undefined;
  minNights?: number | undefined;
  minAmount?: number | undefined;
  validFrom: string;
  validTo?: string | undefined;
};

export type UpdateCouponInput = {
  code?: string | undefined;
  name?: string | undefined;
  discountType?: DiscountType | undefined;
  discountValue?: number | undefined;
  maxUses?: number | undefined;
  minNights?: number | undefined;
  minAmount?: number | undefined;
  validFrom?: string | undefined;
  validTo?: string | undefined;
  isActive?: boolean | undefined;
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
