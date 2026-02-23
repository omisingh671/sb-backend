import { HttpError } from "@/common/errors/http-error.js";
import type {
  CreateRoomPricingInput,
  UpdateRoomPricingInput,
  ListRoomPricingFilters,
} from "./room-pricing.inputs.js";
import type { RoomPricingDTO } from "./room-pricing.dto.js";
import * as repo from "./room-pricing.repository.js";

const mapPricing = (p: any): RoomPricingDTO => ({
  id: p.id,
  productId: p.productId,
  roomId: p.roomId,
  unitId: p.unitId,
  rateType: p.rateType,
  pricingTier: p.pricingTier,
  minNights: p.minNights,
  maxNights: p.maxNights,
  price: Number(p.price),
  taxInclusive: p.taxInclusive,
  validFrom: p.validFrom,
  validTo: p.validTo,
  createdAt: p.createdAt,
  ...(p.product !== undefined && { product: p.product }),
  ...(p.room !== undefined && { room: p.room }),
  ...(p.unit !== undefined && { unit: p.unit }),
});

export const createRoomPricing = async (
  data: CreateRoomPricingInput,
): Promise<RoomPricingDTO> => {
  const pricing = await repo.create(data);
  return mapPricing(pricing);
};

export const getRoomPricingById = async (id: string): Promise<RoomPricingDTO> => {
  const pricing = await repo.findById(id);

  if (!pricing) {
    throw new HttpError(404, "NOT_FOUND", "Room pricing not found");
  }

  return mapPricing(pricing);
};

export const updateRoomPricing = async (
  id: string,
  data: UpdateRoomPricingInput,
): Promise<RoomPricingDTO> => {
  const existing = await repo.findById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Room pricing not found");
  }

  const pricing = await repo.update(id, data);
  return mapPricing(pricing);
};

export const deleteRoomPricing = async (id: string): Promise<void> => {
  const existing = await repo.findById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Room pricing not found");
  }

  await repo.deleteById(id);
};

export const listRoomPricing = async (filters: ListRoomPricingFilters) => {
  const [items, total] = await Promise.all([
    repo.findAll(filters),
    repo.countAll({
      ...(filters.productId !== undefined && { productId: filters.productId }),
      ...(filters.roomId !== undefined && { roomId: filters.roomId }),
      ...(filters.unitId !== undefined && { unitId: filters.unitId }),
      ...(filters.rateType !== undefined && { rateType: filters.rateType }),
      ...(filters.pricingTier !== undefined && { pricingTier: filters.pricingTier }),
    }),
  ]);

  return {
    items: items.map(mapPricing),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
};

export const getActiveRatesForRoom = async (
  roomId: string,
  checkInDate: string,
): Promise<RoomPricingDTO[]> => {
  const date = new Date(checkInDate);
  const rates = await repo.findActiveRatesForRoom(roomId, date);
  return rates.map(mapPricing);
};

export const getActiveRatesForUnit = async (
  unitId: string,
  checkInDate: string,
): Promise<RoomPricingDTO[]> => {
  const date = new Date(checkInDate);
  const rates = await repo.findActiveRatesForUnit(unitId, date);
  return rates.map(mapPricing);
};
