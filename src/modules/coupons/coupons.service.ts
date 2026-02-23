import { HttpError } from "@/common/errors/http-error.js";
import type { CreateCouponInput, UpdateCouponInput, ListCouponsFilters } from "./coupons.inputs.js";
import type { CouponDTO, ValidateCouponResult } from "./coupons.dto.js";
import * as repo from "./coupons.repository.js";

const mapCoupon = (c: any): CouponDTO => ({
  id: c.id,
  code: c.code,
  name: c.name,
  discountType: c.discountType,
  discountValue: Number(c.discountValue),
  maxUses: c.maxUses,
  usedCount: c.usedCount,
  minNights: c.minNights,
  minAmount: c.minAmount !== null ? Number(c.minAmount) : null,
  validFrom: c.validFrom,
  validTo: c.validTo,
  isActive: c.isActive,
  createdAt: c.createdAt,
});

export const createCoupon = async (data: CreateCouponInput): Promise<CouponDTO> => {
  const coupon = await repo.createCoupon(data);
  return mapCoupon(coupon);
};

export const getCouponById = async (id: string): Promise<CouponDTO> => {
  const coupon = await repo.findCouponById(id);

  if (!coupon) {
    throw new HttpError(404, "NOT_FOUND", "Coupon not found");
  }

  return mapCoupon(coupon);
};

export const updateCoupon = async (
  id: string,
  data: UpdateCouponInput,
): Promise<CouponDTO> => {
  const existing = await repo.findCouponById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Coupon not found");
  }

  const coupon = await repo.updateCouponById(id, data);
  return mapCoupon(coupon);
};

export const deleteCoupon = async (id: string): Promise<void> => {
  const existing = await repo.findCouponById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Coupon not found");
  }

  await repo.deleteCouponById(id);
};

export const listCoupons = async (filters: ListCouponsFilters) => {
  const [items, total] = await Promise.all([
    repo.listCoupons(filters),
    repo.countCoupons({
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    }),
  ]);

  return {
    items: items.map(mapCoupon),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
};

export const validateCoupon = async (
  code: string,
  nights: number,
  subtotal: number,
): Promise<ValidateCouponResult> => {
  // 1. Find coupon
  const coupon = await repo.findCouponByCode(code);
  if (!coupon) {
    throw new HttpError(404, "COUPON_NOT_FOUND", "Coupon not found");
  }

  // 2. Check active
  if (!coupon.isActive) {
    throw new HttpError(400, "COUPON_INACTIVE", "Coupon is inactive");
  }

  // 3. Check expiry
  const now = new Date();
  if (coupon.validTo && now > coupon.validTo) {
    throw new HttpError(400, "COUPON_EXPIRED", "Coupon has expired");
  }

  // 4. Check max uses
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw new HttpError(400, "COUPON_EXHAUSTED", "Coupon usage limit reached");
  }

  // 5. Check min nights
  if (coupon.minNights && nights < coupon.minNights) {
    throw new HttpError(
      400,
      "COUPON_MIN_NIGHTS",
      `Minimum ${coupon.minNights} nights required`,
    );
  }

  // 6. Check min amount
  const minAmount = coupon.minAmount !== null ? Number(coupon.minAmount) : null;
  if (minAmount !== null && subtotal < minAmount) {
    throw new HttpError(
      400,
      "COUPON_MIN_AMOUNT",
      `Minimum ₹${minAmount} required`,
    );
  }

  // 7. Calculate discount
  const discountValue = Number(coupon.discountValue);
  const discountAmount =
    coupon.discountType === "PERCENTAGE"
      ? subtotal * (discountValue / 100)
      : Math.min(discountValue, subtotal);

  return {
    couponId: coupon.id,
    code: coupon.code,
    name: coupon.name,
    discountType: coupon.discountType,
    discountValue,
    discountAmount,
  };
};
