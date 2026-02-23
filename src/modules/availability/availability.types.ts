export interface AvailableResult {
  targetType: "ROOM" | "UNIT";
  id: string;
  label: string;
  propertyName: string;
  unitNumber: string;
  floor: number;
  hasAC: boolean;
  maxOccupancy: number;
  totalCapacity: number; // ROOM: = maxOccupancy; UNIT: sum(room.maxOccupancy)
  occupancyLabel: string; // "Single" | "Double" | "Whole Apartment"
  rooms?: { roomNumber: string; hasAC: boolean; maxOccupancy: number }[]; // UNIT only
  rateType: "NIGHTLY" | "WEEKLY";
  pricePerNight: number;
  nights: number;
  subtotal: number;
  taxInclusive: boolean;
  amenities: { name: string; icon: string | null }[];
  minNights: number;
}

export interface AvailabilityResponse {
  checkIn: string;
  checkOut: string;
  nights: number;
  occupancyType: string;
  results: AvailableResult[];
  taxes: { name: string; rate: number; taxType: string }[];
  requiresQuote: boolean;
  requiresQuoteReason?: "LONG_STAY";
  groupMode: boolean; // true when 7+ guests and no single unit fits
  groupGuestsRequired: number; // the guest count searched (e.g. 7)
}
