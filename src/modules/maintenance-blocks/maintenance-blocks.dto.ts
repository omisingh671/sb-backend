export interface MaintenanceBlockDTO {
  id: string;
  targetType: string;
  roomId?: string | null;
  unitId?: string | null;
  propertyId?: string | null;
  reason?: string | null;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  createdAt: Date;
}
