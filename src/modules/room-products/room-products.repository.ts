import { prisma } from "@/db/prisma.js";
import type {
  CreateRoomProductInput,
  UpdateRoomProductInput,
  ListRoomProductsFilters,
} from "./room-products.inputs.js";
import type { RoomProductCategory } from "@/generated/prisma/enums.js";

type WhereFilters = {
  category?: RoomProductCategory;
  hasAC?: boolean;
};

const buildWhere = (filters: WhereFilters) => ({
  ...(filters.category !== undefined && { category: filters.category }),
  ...(filters.hasAC !== undefined && { hasAC: filters.hasAC }),
});

export const createRoomProduct = (data: CreateRoomProductInput) => {
  return prisma.roomProduct.create({ data });
};

export const findRoomProductById = (id: string) => {
  return prisma.roomProduct.findUnique({ where: { id } });
};

export const updateRoomProductById = (id: string, data: UpdateRoomProductInput) => {
  return prisma.roomProduct.update({ where: { id }, data });
};

export const deleteRoomProductById = (id: string) => {
  return prisma.roomProduct.delete({ where: { id } });
};

export const listRoomProducts = ({ page, limit, category, hasAC }: ListRoomProductsFilters) => {
  const where = buildWhere({
    ...(category !== undefined && { category }),
    ...(hasAC !== undefined && { hasAC }),
  });

  return prisma.roomProduct.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
};

export const countRoomProducts = ({
  category,
  hasAC,
}: Omit<ListRoomProductsFilters, "page" | "limit">) => {
  const where = buildWhere({
    ...(category !== undefined && { category }),
    ...(hasAC !== undefined && { hasAC }),
  });

  return prisma.roomProduct.count({ where });
};
