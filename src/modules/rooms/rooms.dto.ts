export interface RoomDTO {
  id: string;
  unitId: string;
  unit: {
    unitNumber: string;
    floor: number;
    property: {
      name: string;
    };
  };
  roomNumber: string;
  hasAC: boolean;
  maxOccupancy: number;
  occupancyLabel: string;
  status: string;
  isActive: boolean;
  amenityIds: string[];
  createdAt: Date;
}
