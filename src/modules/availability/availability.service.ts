import type { AvailableResult, AvailabilityResponse } from "./availability.types.js";
import type { AvailabilityQuery } from "./availability.schema.js";
import * as repo from "./availability.repository.js";

/* ------------------------------------------------------------------
   Internal rate shape (from Prisma RoomPricing)
------------------------------------------------------------------ */

interface RateCandidate {
  rateType: string;
  pricingTier: string;
  minNights: number;
  price: { toString(): string };
  taxInclusive: boolean;
}

/* ------------------------------------------------------------------
   Rate selection
------------------------------------------------------------------ */

export const selectRate = (
  rates: RateCandidate[],
  nights: number,
  pricingTier: string,
): { rate: RateCandidate | null; requiresQuote: boolean; reason?: string } => {
  // Step 1: Long-stay always requires a quote
  if (nights >= 30) {
    return { rate: null, requiresQuote: true, reason: "LONG_STAY" };
  }

  // Step 2: Filter by pricingTier; fallback to STANDARD
  let tieredRates = rates.filter((r) => r.pricingTier === pricingTier);
  if (tieredRates.length === 0 && pricingTier !== "STANDARD") {
    tieredRates = rates.filter((r) => r.pricingTier === "STANDARD");
  }

  // Step 3: Prefer WEEKLY rate when nights >= 7
  if (nights >= 7) {
    const weeklyRate = tieredRates.find((r) => r.rateType === "WEEKLY");
    if (weeklyRate) {
      if (weeklyRate.minNights > nights) return { rate: null, requiresQuote: false };
      return { rate: weeklyRate, requiresQuote: false };
    }
  }

  // Step 4: Fall back to NIGHTLY rate
  const nightlyRate = tieredRates.find((r) => r.rateType === "NIGHTLY");
  if (nightlyRate) {
    if (nightlyRate.minNights > nights) return { rate: null, requiresQuote: false };
    return { rate: nightlyRate, requiresQuote: false };
  }

  // Step 6: No applicable rate found
  return { rate: null, requiresQuote: false };
};

/* ------------------------------------------------------------------
   Result builders
------------------------------------------------------------------ */

export const buildRoomResult = (
  room: {
    id: string;
    roomNumber: string;
    hasAC: boolean;
    maxOccupancy: number;
    unit: {
      unitNumber: string;
      floor: number;
      property: { name: string };
    };
    amenities: { amenity: { name: string; icon: string | null } }[];
  },
  rate: RateCandidate,
  nights: number,
): AvailableResult => ({
  targetType: "ROOM",
  id: room.id,
  label: `Room ${room.roomNumber} — Unit ${room.unit.unitNumber}, ${room.unit.property.name}`,
  propertyName: room.unit.property.name,
  unitNumber: room.unit.unitNumber,
  floor: room.unit.floor,
  hasAC: room.hasAC,
  maxOccupancy: room.maxOccupancy,
  totalCapacity: room.maxOccupancy,
  occupancyLabel: room.maxOccupancy === 1 ? "Single" : "Double",
  rateType: rate.rateType as "NIGHTLY" | "WEEKLY",
  pricePerNight: Number(rate.price),
  nights,
  subtotal: Number(rate.price) * nights,
  taxInclusive: rate.taxInclusive,
  amenities: room.amenities.map((a) => ({ name: a.amenity.name, icon: a.amenity.icon })),
  minNights: rate.minNights,
});

export const buildUnitResult = (
  unit: {
    id: string;
    unitNumber: string;
    floor: number;
    property: { name: string };
    rooms: { roomNumber: string; hasAC: boolean; maxOccupancy: number }[];
    amenities: { amenity: { name: string; icon: string | null } }[];
  },
  rate: RateCandidate,
  nights: number,
): AvailableResult => ({
  targetType: "UNIT",
  id: unit.id,
  label: `Unit ${unit.unitNumber} — ${unit.property.name} (Whole Apartment)`,
  propertyName: unit.property.name,
  unitNumber: unit.unitNumber,
  floor: unit.floor,
  hasAC: unit.rooms.some((r) => r.hasAC),
  maxOccupancy: unit.rooms.reduce((s, r) => s + r.maxOccupancy, 0),
  totalCapacity: unit.rooms.reduce((s, r) => s + r.maxOccupancy, 0),
  occupancyLabel: "Whole Apartment",
  rooms: unit.rooms.map((r) => ({
    roomNumber: r.roomNumber,
    hasAC: r.hasAC,
    maxOccupancy: r.maxOccupancy,
  })),
  rateType: rate.rateType as "NIGHTLY" | "WEEKLY",
  pricePerNight: Number(rate.price),
  nights,
  subtotal: Number(rate.price) * nights,
  taxInclusive: rate.taxInclusive,
  amenities: unit.amenities.map((a) => ({ name: a.amenity.name, icon: a.amenity.icon })),
  minNights: rate.minNights,
});

/* ------------------------------------------------------------------
   Main availability search
------------------------------------------------------------------ */

export const searchAvailability = async (
  params: AvailabilityQuery,
): Promise<AvailabilityResponse> => {
  // Step 1: Parse dates at midnight
  const checkInDate = new Date(`${params.checkIn}T00:00:00`);
  const checkOutDate = new Date(`${params.checkOut}T00:00:00`);

  // Step 2: Calculate nights
  const nights = repo.calculateNights(checkInDate, checkOutDate);

  const pricingTier = params.pricingTier ?? "STANDARD";

  // Step 3: Early return for 30+ nights
  if (nights >= 30) {
    return {
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      nights,
      occupancyType: params.occupancyType,
      results: [],
      taxes: [],
      requiresQuote: true,
      requiresQuoteReason: "LONG_STAY",
      groupMode: false,
      groupGuestsRequired: 0,
    };
  }

  // Step 4: Fetch all exclusion IDs and active taxes in parallel
  const [
    bookedRoomIds,
    bookedUnitIds,
    lockedRoomIds,
    lockedUnitIds,
    maintRoomIds,
    maintUnitIds,
    rawTaxes,
  ] = await Promise.all([
    repo.getBookedRoomIds(checkInDate, checkOutDate),
    repo.getBookedUnitIds(checkInDate, checkOutDate),
    repo.getLockedRoomIds(checkInDate, checkOutDate),
    repo.getLockedUnitIds(checkInDate, checkOutDate),
    repo.getMaintenanceRoomIds(checkInDate, checkOutDate),
    repo.getMaintenanceUnitIds(checkInDate, checkOutDate),
    repo.getActiveTaxes(),
  ]);

  // Step 5: Combine exclusions
  const excludeRoomIds = [
    ...new Set([...bookedRoomIds, ...lockedRoomIds, ...maintRoomIds]),
  ];
  const excludeUnitIds = [
    ...new Set([...bookedUnitIds, ...lockedUnitIds, ...maintUnitIds]),
  ];

  const taxes = rawTaxes.map((t) => ({
    name: t.name,
    rate: Number(t.rate),
    taxType: t.taxType as string,
  }));

  // Step 6: Build results based on occupancyType

  // ── SINGLE or DOUBLE ──────────────────────────────────────────────
  if (params.occupancyType === "single" || params.occupancyType === "double") {
    const maxOccupancy = params.occupancyType === "single" ? 1 : 2;

    const rooms = await repo.searchAvailableRooms({
      maxOccupancy,
      ...(params.hasAC !== undefined && { hasAC: params.hasAC }),
      excludeRoomIds,
      excludeUnitIds,
      checkIn: checkInDate,
    });

    const results: AvailableResult[] = rooms.flatMap((room) => {
      const { rate, requiresQuote } = selectRate(room.pricing, nights, pricingTier);
      if (!rate || requiresQuote) return [];
      return [buildRoomResult(room, rate, nights)];
    });

    return {
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      nights,
      occupancyType: params.occupancyType,
      results: results.sort((a, b) => a.pricePerNight - b.pricePerNight),
      taxes,
      requiresQuote: false,
      groupMode: false,
      groupGuestsRequired: 0,
    };
  }

  // ── UNIT ──────────────────────────────────────────────────────────
  // Attempt 1: find units that fit ALL guests in one apartment
  const fittingUnits = await repo.searchAvailableUnits({
    guests: params.guests!,
    excludeUnitIds,
    checkIn: checkInDate,
  });

  if (fittingUnits.length > 0) {
    // Normal mode — one apartment is enough
    const results: AvailableResult[] = fittingUnits.flatMap((unit) => {
      const { rate, requiresQuote } = selectRate(unit.pricing, nights, pricingTier);
      if (!rate || requiresQuote) return [];
      return [buildUnitResult(unit, rate, nights)];
    });

    return {
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      nights,
      occupancyType: params.occupancyType,
      results: results.sort((a, b) => a.pricePerNight - b.pricePerNight),
      taxes,
      requiresQuote: false,
      groupMode: false,
      groupGuestsRequired: params.guests!,
    };
  }

  // Attempt 2: No single unit fits → GROUP MODE
  const [allUnits, allRooms] = await Promise.all([
    repo.searchAllAvailableUnits({ excludeUnitIds, checkIn: checkInDate }),
    repo.searchAvailableRooms({
      excludeRoomIds,
      excludeUnitIds,
      checkIn: checkInDate,
    }),
  ]);

  const unitResults: AvailableResult[] = allUnits.flatMap((unit) => {
    const { rate, requiresQuote } = selectRate(unit.pricing, nights, pricingTier);
    if (!rate || requiresQuote) return [];
    return [buildUnitResult(unit, rate, nights)];
  });

  const roomResults: AvailableResult[] = allRooms.flatMap((room) => {
    const { rate, requiresQuote } = selectRate(room.pricing, nights, pricingTier);
    if (!rate || requiresQuote) return [];
    return [buildRoomResult(room, rate, nights)];
  });

  // Sort: units by capacity desc, then rooms by price asc
  const sortedUnits = unitResults.sort((a, b) => b.totalCapacity - a.totalCapacity);
  const sortedRooms = roomResults.sort((a, b) => a.pricePerNight - b.pricePerNight);

  return {
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    nights,
    occupancyType: params.occupancyType,
    results: [...sortedUnits, ...sortedRooms],
    taxes,
    requiresQuote: false,
    groupMode: true,
    groupGuestsRequired: params.guests!,
  };
};
