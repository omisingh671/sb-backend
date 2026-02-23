import { HttpError } from "@/common/errors/http-error.js";

import type {
  CreateBlockInput,
  UpdateBlockInput,
  ListBlocksFilters,
} from "./maintenance-blocks.inputs.js";

import type { MaintenanceBlockDTO } from "./maintenance-blocks.dto.js";
import * as repo from "./maintenance-blocks.repository.js";

const mapBlock = (b: any): MaintenanceBlockDTO => ({
  id: b.id,
  targetType: b.targetType,
  roomId: b.roomId,
  unitId: b.unitId,
  propertyId: b.propertyId,
  reason: b.reason,
  startDate: b.startDate,
  endDate: b.endDate,
  createdBy: b.createdBy,
  createdAt: b.createdAt,
});

export const listBlocks = async ({
  page,
  limit,
  targetType,
  upcoming,
}: ListBlocksFilters) => {
  const [items, total] = await Promise.all([
    repo.findAll({
      page,
      limit,
      ...(targetType !== undefined && { targetType }),
      ...(upcoming !== undefined && { upcoming }),
    }),
    repo.countAll({
      ...(targetType !== undefined && { targetType }),
      ...(upcoming !== undefined && { upcoming }),
    }),
  ]);

  return {
    items: items.map(mapBlock),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBlockById = async (id: string): Promise<MaintenanceBlockDTO> => {
  const block = await repo.findById(id);

  if (!block) {
    throw new HttpError(404, "NOT_FOUND", "Maintenance block not found");
  }

  return mapBlock(block);
};

export const createBlock = async (
  data: CreateBlockInput,
): Promise<MaintenanceBlockDTO> => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (data.targetType === "ROOM" && data.roomId) {
    const hasConflict = await repo.findConflictingForRoom(
      data.roomId,
      startDate,
      endDate,
    );

    if (hasConflict) {
      throw new HttpError(
        409,
        "BLOCK_CONFLICT",
        "A maintenance block already exists for this room during the requested period",
      );
    }
  }

  if (data.targetType === "UNIT" && data.unitId) {
    const hasConflict = await repo.findConflictingForUnit(
      data.unitId,
      startDate,
      endDate,
    );

    if (hasConflict) {
      throw new HttpError(
        409,
        "BLOCK_CONFLICT",
        "A maintenance block already exists for this unit during the requested period",
      );
    }
  }

  const block = await repo.create(data);
  return mapBlock(block);
};

export const updateBlock = async (
  id: string,
  data: UpdateBlockInput,
): Promise<MaintenanceBlockDTO> => {
  const existing = await repo.findById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Maintenance block not found");
  }

  const block = await repo.update(id, {
    ...(data.reason !== undefined && { reason: data.reason }),
    ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
    ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
  });

  return mapBlock(block);
};

export const deleteBlock = async (id: string): Promise<void> => {
  const existing = await repo.findById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Maintenance block not found");
  }

  await repo.remove(id);
};
