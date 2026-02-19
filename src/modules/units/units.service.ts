import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";

import type {
  CreateUnitInput,
  UpdateUnitInput,
  ListUnitsFilters,
} from "./units.inputs.js";

import type { UnitDTO } from "./units.dto.js";
import * as repo from "./units.repository.js";

const mapUnit = (u: any): UnitDTO => ({
  id: u.id,
  propertyId: u.propertyId,
  unitNumber: u.unitNumber,
  floor: u.floor,
  status: u.status,
  isActive: u.isActive,
  amenityIds: u.amenities?.map((a: any) => a.amenityId) ?? [],
  createdAt: u.createdAt,
});

export const createUnit = async (data: CreateUnitInput): Promise<UnitDTO> => {
  try {
    const unit = await repo.createUnit({
      propertyId: data.propertyId,
      unitNumber: data.unitNumber,
      floor: data.floor,
      ...(data.status !== undefined && { status: data.status }),
      ...(data.amenityIds !== undefined && {
        amenities: {
          createMany: {
            data: data.amenityIds.map((id) => ({ amenityId: id })),
          },
        },
      }),
    });

    return mapUnit(unit);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "UNIT_EXISTS",
        "A unit with this number already exists for this property",
      );
    }

    throw err;
  }
};

export const getUnitById = async (id: string): Promise<UnitDTO> => {
  const unit = await repo.findUnitById(id);

  if (!unit) {
    throw new HttpError(404, "NOT_FOUND", "Unit not found");
  }

  return mapUnit(unit);
};

export const updateUnit = async (
  id: string,
  data: UpdateUnitInput,
): Promise<UnitDTO> => {
  try {
    const existing = await repo.findUnitById(id);

    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Unit not found");
    }

    await repo.updateUnitById(id, {
      ...(data.unitNumber !== undefined && { unitNumber: data.unitNumber }),
      ...(data.floor !== undefined && { floor: data.floor }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    let unit;

    if (data.amenityIds !== undefined) {
      if (data.amenityIds.length > 0) {
        const validCount = await repo.countActiveAmenitiesByIds(data.amenityIds);

        if (validCount !== data.amenityIds.length) {
          throw new HttpError(
            400,
            "INVALID_AMENITY",
            "One or more amenities are invalid or inactive",
          );
        }
      }

      unit = await repo.replaceUnitAmenities(id, data.amenityIds);
    } else {
      unit = await repo.findUnitById(id);
    }

    if (!unit) {
      throw new HttpError(404, "NOT_FOUND", "Unit not found");
    }

    return mapUnit(unit);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "UNIT_EXISTS",
        "A unit with this number already exists for this property",
      );
    }

    throw err;
  }
};

export const listUnits = async ({
  page,
  limit,
  propertyId,
  status,
  isActive,
}: ListUnitsFilters) => {
  const [items, total] = await Promise.all([
    repo.listUnits({
      page,
      limit,
      ...(propertyId !== undefined && { propertyId }),
      ...(status !== undefined && { status }),
      ...(isActive !== undefined && { isActive }),
    }),
    repo.countUnits({
      ...(propertyId !== undefined && { propertyId }),
      ...(status !== undefined && { status }),
      ...(isActive !== undefined && { isActive }),
    }),
  ]);

  return {
    items: items.map(mapUnit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
