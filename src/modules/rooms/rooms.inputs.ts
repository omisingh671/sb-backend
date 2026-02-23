import type { RoomStatus } from "@/generated/prisma/enums.js";

export interface CreateRoomInput {
  unitId: string;
  roomNumber: string;
  hasAC: boolean;
  maxOccupancy: number;
  status?: RoomStatus;
  amenityIds?: string[];
}

export interface UpdateRoomInput {
  unitId?: string;
  roomNumber?: string;
  hasAC?: boolean;
  maxOccupancy?: number;
  status?: RoomStatus;
  amenityIds?: string[];
}

export interface ListRoomsFilters {
  page: number;
  limit: number;
  unitId?: string;
  maxOccupancy?: number;
  hasAC?: boolean;
  status?: RoomStatus;
  isActive?: boolean;
}
