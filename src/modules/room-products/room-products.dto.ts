import type { RoomProductCategory } from "@/generated/prisma/enums.js";

export type RoomProductDTO = {
  id: string;
  name: string;
  occupancy: number;
  hasAC: boolean;
  category: RoomProductCategory;
  createdAt: Date;
};
