import type { UnitStatus } from "@/generated/prisma/enums.js";

export interface UnitDTO {
  id: string;
  propertyId: string;
  unitNumber: string;
  floor: number;
  status: UnitStatus;
  isActive: boolean;
  amenityIds: string[];
  createdAt: Date;
}
