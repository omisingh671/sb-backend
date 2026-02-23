import type { RateType, PricingTier } from "@/generated/prisma/enums.js";

export type CreateRoomPricingInput = {
  productId: string;
  roomId?: string;
  unitId?: string;
  rateType: RateType;
  pricingTier: PricingTier;
  minNights: number;
  maxNights?: number;
  price: number;
  taxInclusive: boolean;
  validFrom: string;
  validTo?: string;
};

export type UpdateRoomPricingInput = Partial<CreateRoomPricingInput>;

export type ListRoomPricingFilters = {
  page: number;
  limit: number;
  productId?: string;
  roomId?: string;
  unitId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
};
