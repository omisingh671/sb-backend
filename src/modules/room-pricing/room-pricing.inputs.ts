import type { RateType, PricingTier } from "@/generated/prisma/enums.js";

export type CreateRoomPricingInput = {
  productId: string;
  roomId?: string | undefined;
  unitId?: string | undefined;
  rateType: RateType;
  pricingTier: PricingTier;
  minNights: number;
  maxNights?: number | undefined;
  price: number;
  taxInclusive: boolean;
  validFrom: string;
  validTo?: string | undefined;
};

export type UpdateRoomPricingInput = {
  productId?: string | undefined;
  roomId?: string | undefined;
  unitId?: string | undefined;
  rateType?: RateType | undefined;
  pricingTier?: PricingTier | undefined;
  minNights?: number | undefined;
  maxNights?: number | undefined;
  price?: number | undefined;
  taxInclusive?: boolean | undefined;
  validFrom?: string | undefined;
  validTo?: string | undefined;
};

export type ListRoomPricingFilters = {
  page: number;
  limit: number;
  productId?: string;
  roomId?: string;
  unitId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
};
