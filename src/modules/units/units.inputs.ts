import type { UnitStatus } from "@/generated/prisma/enums.js";

export interface CreateUnitInput {
  propertyId: string;
  unitNumber: string;
  floor: number;
  status?: UnitStatus;
  amenityIds?: string[];
}

export interface UpdateUnitInput {
  unitNumber?: string;
  floor?: number;
  status?: UnitStatus;
  isActive?: boolean;
  amenityIds?: string[];
}

export interface ListUnitsFilters {
  page: number;
  limit: number;
  propertyId?: string;
  status?: UnitStatus;
  isActive?: boolean;
}
