import { HttpError } from "@/common/errors/http-error.js";
import type {
  CreateRoomProductInput,
  UpdateRoomProductInput,
  ListRoomProductsFilters,
} from "./room-products.inputs.js";
import type { RoomProductDTO } from "./room-products.dto.js";
import * as repo from "./room-products.repository.js";

const mapRoomProduct = (p: any): RoomProductDTO => ({
  id: p.id,
  name: p.name,
  occupancy: p.occupancy,
  hasAC: p.hasAC,
  category: p.category,
  createdAt: p.createdAt,
});

export const createRoomProduct = async (
  data: CreateRoomProductInput,
): Promise<RoomProductDTO> => {
  const product = await repo.createRoomProduct(data);
  return mapRoomProduct(product);
};

export const getRoomProductById = async (id: string): Promise<RoomProductDTO> => {
  const product = await repo.findRoomProductById(id);

  if (!product) {
    throw new HttpError(404, "NOT_FOUND", "Room product not found");
  }

  return mapRoomProduct(product);
};

export const updateRoomProduct = async (
  id: string,
  data: UpdateRoomProductInput,
): Promise<RoomProductDTO> => {
  const existing = await repo.findRoomProductById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Room product not found");
  }

  const product = await repo.updateRoomProductById(id, data);
  return mapRoomProduct(product);
};

export const deleteRoomProduct = async (id: string): Promise<void> => {
  const existing = await repo.findRoomProductById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Room product not found");
  }

  await repo.deleteRoomProductById(id);
};

export const listRoomProducts = async (filters: ListRoomProductsFilters) => {
  const [items, total] = await Promise.all([
    repo.listRoomProducts(filters),
    repo.countRoomProducts({
      ...(filters.category !== undefined && { category: filters.category }),
      ...(filters.hasAC !== undefined && { hasAC: filters.hasAC }),
    }),
  ]);

  return {
    items: items.map(mapRoomProduct),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
};
