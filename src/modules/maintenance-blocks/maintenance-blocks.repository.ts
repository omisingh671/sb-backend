import { prisma } from "@/db/prisma.js";
import type { CreateBlockInput, ListBlocksFilters } from "./maintenance-blocks.inputs.js";

/* ----------------------------------
   Repository API
----------------------------------- */

export const findAll = ({
  page,
  limit,
  targetType,
  upcoming,
}: ListBlocksFilters) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    ...(targetType !== undefined && { targetType }),
    ...(upcoming === true && { startDate: { gte: today } }),
    ...(upcoming === false && { endDate: { lt: today } }),
  };

  return prisma.maintenanceBlock.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { startDate: "asc" },
  });
};

export const countAll = ({
  targetType,
  upcoming,
}: Omit<ListBlocksFilters, "page" | "limit">) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    ...(targetType !== undefined && { targetType }),
    ...(upcoming === true && { startDate: { gte: today } }),
    ...(upcoming === false && { endDate: { lt: today } }),
  };

  return prisma.maintenanceBlock.count({ where });
};

export const findById = (id: string) => {
  return prisma.maintenanceBlock.findUnique({ where: { id } });
};

export const findConflictingForRoom = (
  roomId: string,
  startDate: Date,
  endDate: Date,
): Promise<boolean> => {
  return prisma.maintenanceBlock
    .findFirst({
      where: {
        roomId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    })
    .then((result) => result !== null);
};

export const findConflictingForUnit = (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<boolean> => {
  return prisma.maintenanceBlock
    .findFirst({
      where: {
        unitId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    })
    .then((result) => result !== null);
};

export const create = (data: CreateBlockInput) => {
  return prisma.maintenanceBlock.create({
    data: {
      targetType: data.targetType,
      ...(data.roomId !== undefined && { roomId: data.roomId }),
      ...(data.unitId !== undefined && { unitId: data.unitId }),
      ...(data.propertyId !== undefined && { propertyId: data.propertyId }),
      ...(data.reason !== undefined && { reason: data.reason }),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      createdBy: data.createdBy,
    },
  });
};

export const update = (
  id: string,
  data: {
    reason?: string;
    startDate?: Date;
    endDate?: Date;
  },
) => {
  return prisma.maintenanceBlock.update({
    where: { id },
    data,
  });
};

export const remove = (id: string) => {
  return prisma.maintenanceBlock.delete({ where: { id } });
};
