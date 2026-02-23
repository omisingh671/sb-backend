export interface RoomDTO {
  id: string;
  unitId: string;
  roomNumber: string;
  hasAC: boolean;
  maxOccupancy: number;
  occupancyLabel: string;
  status: string;
  isActive: boolean;
  amenityIds: string[];
  createdAt: Date;
}
