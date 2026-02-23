import type { RateType, PricingTier } from "@/generated/prisma/enums.js";

export type RoomPricingDTO = {
  id: string;
  productId: string;
  roomId: string | null;
  unitId: string | null;
  rateType: RateType;
  pricingTier: PricingTier;
  minNights: number;
  maxNights: number | null;
  price: number;
  taxInclusive: boolean;
  validFrom: Date;
  validTo: Date | null;
  createdAt: Date;
  product?: {
    id: string;
    name: string;
    occupancy: number;
    hasAC: boolean;
    category: string;
  };
  room?: {
    id: string;
    roomNumber: string;
    unit?: {
      id: string;
      unitNumber: string;
      property?: {
        id: string;
        name: string;
      };
    };
  } | null;
  unit?: {
    id: string;
    unitNumber: string;
    property?: {
      id: string;
      name: string;
    };
  } | null;
};
