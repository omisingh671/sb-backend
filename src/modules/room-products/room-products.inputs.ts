import type { RoomProductCategory } from "@/generated/prisma/enums.js";

export type CreateRoomProductInput = {
  name: string;
  occupancy: number;
  hasAC: boolean;
  category: RoomProductCategory;
};

export type UpdateRoomProductInput = Partial<CreateRoomProductInput>;

export type ListRoomProductsFilters = {
  page: number;
  limit: number;
  category?: RoomProductCategory;
  hasAC?: boolean;
};
