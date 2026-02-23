import type { DiscountType } from "@/generated/prisma/enums.js";

export type CouponDTO = {
  id: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minNights: number | null;
  minAmount: number | null;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  createdAt: Date;
};

export type ValidateCouponResult = {
  couponId: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
};
