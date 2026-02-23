export interface CreateBlockInput {
  targetType: "ROOM" | "UNIT" | "PROPERTY";
  roomId?: string;
  unitId?: string;
  propertyId?: string;
  reason?: string;
  startDate: string;
  endDate: string;
  createdBy: string;
}

export interface UpdateBlockInput {
  reason?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListBlocksFilters {
  page: number;
  limit: number;
  targetType?: "ROOM" | "UNIT" | "PROPERTY";
  upcoming?: boolean;
}
