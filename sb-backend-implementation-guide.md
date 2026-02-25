# Sucasa Homes — Backend Implementation Guide
### `sb-backend` · Node.js · Express · Prisma · TypeScript · MySQL

---

## How to Use This Document

- **One STEP = one Claude Code session**
- Read every "Read first" file listed at the top of each step BEFORE writing any code
- Complete all backend phases (0–4) before starting any frontend work
- Test each phase with Postman using the checklist at the bottom
- Steps within a phase must be done in order — each depends on the previous
- Run `npx tsc --noEmit` at the end of every session

---

## Project Architecture

```
sb-backend/
├── prisma/
│   └── schema.prisma              ← single source of truth for DB
├── src/
│   ├── app.ts                     ← all routers registered here
│   ├── common/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   └── errors/
│   │       ├── AppError.ts
│   │       └── errorHandler.ts
│   └── modules/
│       ├── units/                 ← REFERENCE — mirror this for all new modules
│       ├── rooms/                 ← Phase 1A
│       ├── maintenance-blocks/    ← Phase 1B
│       ├── room-products/         ← Phase 2A
│       ├── room-pricing/          ← Phase 2A
│       ├── taxes/                 ← Phase 2B
│       ├── coupons/               ← Phase 2C
│       ├── availability/          ← Phase 3A (largest — 2 sessions)
│       ├── inventory-locks/       ← Phase 4A
│       ├── bookings/              ← Phase 4B (most complex — 2 sessions)
│       ├── enquiries/             ← Phase 4C
│       ├── quotes/                ← Phase 4C
│       └── dashboard/             ← Phase 4C
```

### Every module has exactly 7 files:
```
[module].schema.ts       ← Zod validation schemas
[module].dto.ts          ← TypeScript types / interfaces
[module].repository.ts   ← All Prisma queries (no business logic here)
[module].service.ts      ← Business logic (calls repository)
[module].controller.ts   ← HTTP handlers: parse req → call service → send res
[module].routes.ts       ← Express Router with middleware
index.ts                 ← Barrel export
```

### Standard API response shape:
```typescript
// Always wrap responses like this:
res.status(200).json({ success: true, data: result })
res.status(201).json({ success: true, data: created })
res.status(400).json({ success: false, error: { code: "ERROR_CODE", message: "Human message" } })
```

---

## Business Rules Reference

### Booking Types
| BookingType | When it applies |
|---|---|
| `ROOM` | Single room booked, < 7 nights |
| `UNIT` | Whole apartment booked, < 7 nights |
| `MULTI_ROOM` | 2+ items in one booking (group) |
| `LONG_STAY` | Any booking ≥ 7 nights |
| `CORPORATE` | Corporate pricing tier (set manually) |

### Rate Selection Logic (sequential priority)
```
1. nights >= 30  → requiresQuote: true, reason: "LONG_STAY"  (no rate returned)
2. Try to match requested pricingTier (CORPORATE etc), fallback to STANDARD
3. nights >= 7   → look for WEEKLY rate first
4. Default       → use NIGHTLY rate
5. rate.minNights > nights → skip this room (return no rate)
6. No matching rate → skip this room
```

### Inventory Conflict = room is unavailable when ANY of these are true:
- Has a direct ROOM-level booking overlapping the dates (status: PENDING/CONFIRMED/CHECKED_IN)
- Its parent unit has a UNIT-level booking overlapping the dates
- Has an unexpired InventoryLock overlapping the dates
- Has a MaintenanceBlock overlapping the dates
- Its parent property has a MaintenanceBlock overlapping the dates

### Group Mode
- Triggered when `occupancyType=unit` AND no single unit has `sum(room.maxOccupancy) >= guests`
- Returns ALL available units + ALL available rooms
- Frontend lets user select combination until coverage ≥ guests required

---

## PHASE 0 — Schema Migration

### STEP 0 — Complete Schema Overhaul

**Repo: `sb-backend`** | **Time: 1 session**

**Read first:**
- `prisma/schema.prisma` — read the ENTIRE file before editing
- `src/modules/units/units.repository.ts` — understand the Prisma patterns used

**Make ALL changes below in a single edit to `prisma/schema.prisma`:**

#### Part A — Add enums (insert after existing `RoomStatus` enum):
```prisma
enum RateType     { NIGHTLY WEEKLY MONTHLY }
enum PricingTier  { STANDARD CORPORATE SEASONAL }
enum BookingType  { ROOM UNIT MULTI_ROOM LONG_STAY CORPORATE }
enum DiscountType { PERCENTAGE FIXED }
enum TaxType      { PERCENTAGE FIXED }
```

#### Part B — Update `Room` model — add before `createdAt`:
```prisma
bookingItems BookingItem[]
```

#### Part C — Update `RoomPricing` model — add 5 fields between `productId` and `price`:
```prisma
rateType     RateType    @default(NIGHTLY)
pricingTier  PricingTier @default(STANDARD)
minNights    Int         @default(1)
maxNights    Int?
taxInclusive Boolean     @default(false)
```
> **Do NOT add `extraGuestCharge`** — pricing is flat per room regardless of 1 or 2 guests.

#### Part D — Replace entire `Booking` model:
```prisma
model Booking {
  id          String      @id @default(uuid())
  bookingRef  String      @unique
  userId      String
  bookingType BookingType

  guestName  String
  guestEmail String
  guestPhone String

  checkIn  DateTime
  checkOut DateTime
  nights   Int
  guests   Int

  subtotal       Decimal
  taxAmount      Decimal @default(0)
  discountAmount Decimal @default(0)
  totalAmount    Decimal

  couponId   String?
  couponCode String?
  notes      String?  @db.Text
  status     String   @default("PENDING")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User          @relation(fields:[userId], references:[id], map:"fk_booking_user")
  coupon Coupon?       @relation(fields:[couponId], references:[id], map:"fk_booking_coupon")
  items  BookingItem[]

  @@index([userId])
  @@index([status])
  @@index([checkIn, checkOut])
  @@map("bookings")
}
```

#### Part E — Update `QuoteRequest` model:
Change `userId String` to `userId String?`

#### Part F — Add 5 new models (insert after Booking model):
```prisma
model BookingItem {
  id        String @id @default(uuid())
  bookingId String

  targetType String   // "ROOM" | "UNIT"
  roomId     String?
  unitId     String?

  pricingId     String?
  rateType      String
  pricePerNight Decimal
  nights        Int
  subtotal      Decimal
  label         String

  booking Booking @relation(fields:[bookingId], references:[id], onDelete:Cascade, map:"fk_item_booking")
  room    Room?   @relation(fields:[roomId], references:[id], map:"fk_item_room")
  unit    Unit?   @relation(fields:[unitId], references:[id], map:"fk_item_unit")

  @@index([bookingId])
  @@map("booking_items")
}

model Tax {
  id        String   @id @default(uuid())
  name      String
  rate      Decimal
  taxType   TaxType  @default(PERCENTAGE)
  appliesTo String   @default("ALL")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("taxes")
}

model Coupon {
  id            String       @id @default(uuid())
  code          String       @unique
  name          String
  discountType  DiscountType @default(PERCENTAGE)
  discountValue Decimal
  maxUses       Int?
  usedCount     Int          @default(0)
  minNights     Int?
  minAmount     Decimal?
  validFrom     DateTime
  validTo       DateTime?
  isActive      Boolean      @default(true)
  createdAt     DateTime     @default(now())

  bookings Booking[]

  @@map("coupons")
}

model InventoryLock {
  id         String   @id @default(uuid())
  sessionKey String   @unique
  targetType String   // "ROOM" | "UNIT"
  roomId     String?
  unitId     String?
  checkIn    DateTime
  checkOut   DateTime
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  @@index([expiresAt])
  @@index([roomId])
  @@index([unitId])
  @@map("inventory_locks")
}

model MaintenanceBlock {
  id         String   @id @default(uuid())
  targetType String   // "ROOM" | "UNIT" | "PROPERTY"
  roomId     String?
  unitId     String?
  propertyId String?
  reason     String?
  startDate  DateTime
  endDate    DateTime
  createdBy  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([startDate, endDate])
  @@map("maintenance_blocks")
}
```

#### Run after all edits:
```bash
npx prisma migrate dev --name booking_system_final
npx prisma generate
```
> Migration must succeed with zero errors before proceeding to Phase 1.

---

## PHASE 1 — Inventory Backend

### STEP 1A — Rooms Module

**Repo: `sb-backend`** | **Time: 1 session**

**Read first:**
- `src/modules/units/units.schema.ts`
- `src/modules/units/units.repository.ts`
- `src/modules/units/units.service.ts`
- `src/modules/units/units.controller.ts`
- `src/modules/units/units.routes.ts`

Create `src/modules/rooms/` mirroring units exactly. Differences only:

**`rooms.schema.ts`:**
```typescript
export const createRoomSchema = z.object({
  unitId:       z.string().uuid(),
  roomNumber:   z.string().min(1).max(10),
  hasAC:        z.boolean(),
  maxOccupancy: z.number().int().min(1).max(10),
  status:       z.enum(["ACTIVE","INACTIVE","MAINTENANCE"]).optional(),
  amenityIds:   z.array(z.string().uuid()).optional()
})
export const updateRoomSchema = createRoomSchema.partial()
```

**`rooms.dto.ts`:**
```typescript
export type RoomDTO = {
  id:             string
  unitId:         string
  roomNumber:     string
  hasAC:          boolean
  maxOccupancy:   number
  occupancyLabel: string   // "Single" | "Double" | "Group"
  status:         string
  isActive:       boolean
  amenityIds:     string[]
  createdAt:      Date
}
```

**`rooms.service.ts` — map function:**
```typescript
const mapRoom = (r: any): RoomDTO => ({
  ...fields,
  occupancyLabel: r.maxOccupancy === 1 ? "Single"
                : r.maxOccupancy === 2 ? "Double"
                : "Group"
})
```

**`rooms.routes.ts` — route definitions:**
```
GET /             → PUBLIC  (?unitId= &maxOccupancy= &hasAC= &status= &isActive=)
GET /:id          → PUBLIC
POST /            → authenticate + authorize([ADMIN, MANAGER])
PATCH /:id        → authenticate + authorize([ADMIN, MANAGER])
PATCH /:id/active → authenticate + authorize([ADMIN, MANAGER])
DELETE /:id       → authenticate + authorize([ADMIN])
```

**Error handling:** On duplicate `roomNumber` in same unit → catch Prisma `P2002` → throw `409 "ROOM_EXISTS"`.

**Register in `src/app.ts`:**
```typescript
import { roomsRouter } from './modules/rooms'
app.use(`${API_PREFIX}/rooms`, roomsRouter)
```

---

### STEP 1B — Maintenance Blocks Module

**Repo: `sb-backend`** | **Time: 1 session**

**Read first:**
- `src/modules/amenities/amenities.service.ts`
- `src/modules/amenities/amenities.repository.ts`
- `src/common/middleware/auth.middleware.ts`

Create `src/modules/maintenance-blocks/`:

**`maintenance-blocks.schema.ts`:**
```typescript
export const createBlockSchema = z.object({
  targetType: z.enum(["ROOM","UNIT","PROPERTY"]),
  roomId:     z.string().uuid().optional(),
  unitId:     z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  reason:     z.string().max(500).optional(),
  startDate:  z.string().refine(v => !isNaN(Date.parse(v))),
  endDate:    z.string().refine(v => !isNaN(Date.parse(v)))
}).superRefine((data, ctx) => {
  if (data.targetType === "ROOM" && !data.roomId)
    ctx.addIssue({ code:"custom", message:"roomId required for ROOM target", path:["roomId"] })
  if (data.targetType === "UNIT" && !data.unitId)
    ctx.addIssue({ code:"custom", message:"unitId required for UNIT target", path:["unitId"] })
  if (data.targetType === "PROPERTY" && !data.propertyId)
    ctx.addIssue({ code:"custom", message:"propertyId required for PROPERTY target", path:["propertyId"] })
  if (Date.parse(data.endDate) < Date.parse(data.startDate))
    ctx.addIssue({ code:"custom", message:"End date must be on or after start date", path:["endDate"] })
})
```

**`maintenance-blocks.repository.ts` functions:**
```typescript
findAll({ page, limit, targetType?, upcoming?: boolean })
  // upcoming=true  → startDate >= today (future blocks)
  // upcoming=false → endDate < today   (past blocks)

findConflictingForRoom(roomId: string, startDate: Date, endDate: Date): Promise<boolean>
findConflictingForUnit(unitId: string, startDate: Date, endDate: Date): Promise<boolean>
create(data: CreateBlockInput & { createdBy: string })
update(id: string, data: Partial<CreateBlockInput>)
delete(id: string)
```

**`maintenance-blocks.controller.ts`:** Extract `req.user!.userId` as `createdBy` in the create handler.

**Routes:**
```
GET /    → authenticate + authorize([ADMIN, MANAGER])
GET /:id → authenticate + authorize([ADMIN, MANAGER])
POST /   → authenticate + authorize([ADMIN, MANAGER])
PATCH /:id → authenticate + authorize([ADMIN, MANAGER])
DELETE /:id → authenticate + authorize([ADMIN])
```

Register in `src/app.ts`.

---

## PHASE 2 — Pricing Backend

### STEP 2A — Room Products + Room Pricing

**Repo: `sb-backend`** | **Time: 1 session**

**Read first:** `src/modules/amenities/` — entire folder, exact pattern to follow.

#### Part A — Room Products (`src/modules/room-products/`):

Module may exist as a stub — verify it has full CRUD. If not, build it.

```typescript
export const createProductSchema = z.object({
  name:      z.string().min(1).max(100),
  occupancy: z.number().int().min(1).max(10),
  hasAC:     z.boolean(),
  category:  z.enum(["NIGHTLY","LONG_STAY","CORPORATE"])
})
```

Routes: GET → public, write → Admin/Manager. Register in `src/app.ts`.

---

#### Part B — Room Pricing (`src/modules/room-pricing/`):

**`room-pricing.schema.ts`:**
```typescript
export const createPricingSchema = z.object({
  productId:    z.string().uuid(),
  roomId:       z.string().uuid().optional(),
  unitId:       z.string().uuid().optional(),
  rateType:     z.enum(["NIGHTLY","WEEKLY","MONTHLY"]).default("NIGHTLY"),
  pricingTier:  z.enum(["STANDARD","CORPORATE","SEASONAL"]).default("STANDARD"),
  minNights:    z.number().int().min(1).default(1),
  maxNights:    z.number().int().optional(),
  price:        z.number().positive(),
  taxInclusive: z.boolean().default(false),
  validFrom:    z.string().refine(v => !isNaN(Date.parse(v))),
  validTo:      z.string().optional().refine(v => !v || !isNaN(Date.parse(v)))
}).superRefine((data, ctx) => {
  if (!data.roomId && !data.unitId)
    ctx.addIssue({ code:"custom", message:"Provide either roomId or unitId", path:["roomId"] })
  if (data.roomId && data.unitId)
    ctx.addIssue({ code:"custom", message:"Provide only one of roomId or unitId", path:["unitId"] })
  if (data.validTo && Date.parse(data.validTo) <= Date.parse(data.validFrom))
    ctx.addIssue({ code:"custom", message:"validTo must be after validFrom", path:["validTo"] })
  if (data.maxNights && data.maxNights < data.minNights)
    ctx.addIssue({ code:"custom", message:"maxNights must be >= minNights", path:["maxNights"] })
})
export const updatePricingSchema = createPricingSchema.partial()
```

**`room-pricing.repository.ts` — key functions:**
```typescript
// Active rates for conflict-free rate selection
findActiveRatesForRoom(roomId: string, checkInDate: Date): Promise<RoomPricing[]>
  // WHERE roomId = X
  //   AND validFrom <= checkInDate
  //   AND (validTo IS NULL OR validTo >= checkInDate)
  // Returns ALL matching rates (service picks the right one)

findActiveRatesForUnit(unitId: string, checkInDate: Date): Promise<RoomPricing[]>
  // Same filter but for unitId

findAll({ page, limit, productId?, roomId?, unitId?, rateType?, pricingTier? })
findById(id)   // include: product + room(unit+property) + unit(property)
create(data)
update(id, data)
delete(id)
```

Routes: GET → public, write → Admin/Manager. Register both modules in `src/app.ts`.

---

### STEP 2B — Taxes Module

**Repo: `sb-backend`** | **Time: 0.5 sessions**

**Read first:** `src/modules/amenities/` — copy structure exactly.

Create `src/modules/taxes/`:

```typescript
export const createTaxSchema = z.object({
  name:      z.string().min(1).max(100),
  rate:      z.number().positive().max(100),
  taxType:   z.enum(["PERCENTAGE","FIXED"]).default("PERCENTAGE"),
  appliesTo: z.enum(["ALL","ROOM","UNIT","CORPORATE"]).default("ALL")
})
export const updateTaxSchema = createTaxSchema.partial().extend({
  isActive: z.boolean().optional()
})
```

Routes: `GET /` and `GET /:id` → PUBLIC. Write → Admin/Manager. Register in `src/app.ts`.

---

### STEP 2C — Coupons Module

**Repo: `sb-backend`** | **Time: 1 session**

**Read first:** `src/modules/amenities/` — base pattern.

Create `src/modules/coupons/`:

**`coupons.schema.ts`:**
```typescript
export const createCouponSchema = z.object({
  code:          z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/),
  name:          z.string().min(1).max(100),
  discountType:  z.enum(["PERCENTAGE","FIXED"]).default("PERCENTAGE"),
  discountValue: z.number().positive(),
  maxUses:       z.number().int().positive().optional(),
  minNights:     z.number().int().min(1).optional(),
  minAmount:     z.number().positive().optional(),
  validFrom:     z.string().refine(v => !isNaN(Date.parse(v))),
  validTo:       z.string().optional().refine(v => !v || !isNaN(Date.parse(v)))
}).superRefine((data, ctx) => {
  if (data.discountType === "PERCENTAGE" && data.discountValue > 100)
    ctx.addIssue({ code:"custom", message:"Percentage discount cannot exceed 100%", path:["discountValue"] })
})

export const validateCouponSchema = z.object({
  code:     z.string(),
  checkIn:  z.string().refine(v => !isNaN(Date.parse(v))),
  checkOut: z.string().refine(v => !isNaN(Date.parse(v))),
  subtotal: z.number().positive()
})
```

**`coupons.service.ts` — validateCoupon(code, nights, subtotal):**
```typescript
// Step-by-step validation (order matters):
1. findCouponByCode(code)        → if not found: throw 404 "COUPON_NOT_FOUND"
2. if !isActive                  → throw 400 "COUPON_INACTIVE"
3. if validTo && now > validTo   → throw 400 "COUPON_EXPIRED"
4. if maxUses && usedCount >= maxUses → throw 400 "COUPON_EXHAUSTED"
5. if minNights && nights < minNights → throw 400 "COUPON_MIN_NIGHTS"
   message: `Minimum ${N} nights required`
6. if minAmount && subtotal < minAmount → throw 400 "COUPON_MIN_AMOUNT"
   message: `Minimum ₹${X} subtotal required`
7. discountAmount = discountType === "PERCENTAGE"
     ? subtotal * (discountValue / 100)
     : Math.min(Number(discountValue), subtotal)   // ← cap at subtotal for FIXED
8. return { couponId, code, name, discountType, discountValue, discountAmount }
```

**Routes — CRITICAL ordering:**
```
POST /validate → PUBLIC  ← MUST be defined BEFORE /:id or Express matches "validate" as a UUID
GET /          → Admin/Manager
GET /:id       → Admin/Manager
POST /         → Admin/Manager
PATCH /:id     → Admin/Manager
DELETE /:id    → Admin/Manager
```

Register in `src/app.ts`.

---

## PHASE 3 — Availability Engine

### STEP 3A — Availability Module

**Repo: `sb-backend`** | **Time: 2 sessions** ← largest backend step

**Read first (ALL of these before writing any code):**
- `src/modules/rooms/rooms.repository.ts`
- `src/modules/units/units.repository.ts`
- `src/modules/room-pricing/room-pricing.repository.ts`
- `src/modules/maintenance-blocks/maintenance-blocks.repository.ts`
- `prisma/schema.prisma` — full schema

Create `src/modules/availability/`:

---

**`availability.schema.ts`:**
```typescript
export const availabilityQuerySchema = z.object({
  checkIn:      z.string().refine(v => !isNaN(Date.parse(v)), "Invalid check-in date"),
  checkOut:     z.string().refine(v => !isNaN(Date.parse(v)), "Invalid check-out date"),
  occupancyType: z.enum(["single","double","unit"]),
  guests:       z.coerce.number().int().min(1).max(20).optional(),
  hasAC:        z.string().optional().transform(v =>
                  v === "true" ? true : v === "false" ? false : undefined),
  pricingTier:  z.enum(["STANDARD","CORPORATE"]).optional().default("STANDARD")
}).superRefine((data, ctx) => {
  const inTs  = Date.parse(data.checkIn)
  const outTs = Date.parse(data.checkOut)
  if (!isNaN(inTs) && !isNaN(outTs)) {
    if (outTs <= inTs)
      ctx.addIssue({ code:"custom", message:"Check-out must be after check-in", path:["checkOut"] })
    if (inTs < Date.now() - 86400000)
      ctx.addIssue({ code:"custom", message:"Check-in cannot be in the past", path:["checkIn"] })
  }
  if (data.occupancyType === "unit" && !data.guests)
    ctx.addIssue({ code:"custom", message:"guests is required for unit search", path:["guests"] })
})
```

---

**`availability.types.ts`:**
```typescript
export interface AvailableResult {
  targetType:     "ROOM" | "UNIT"
  id:             string
  label:          string
  propertyName:   string
  unitNumber:     string
  floor:          number
  hasAC:          boolean
  maxOccupancy:   number
  totalCapacity:  number       // ROOM: same as maxOccupancy; UNIT: sum of all room.maxOccupancy
  occupancyLabel: string       // "Single" | "Double" | "Whole Apartment"
  rooms?:         { roomNumber: string; hasAC: boolean; maxOccupancy: number }[]  // UNIT only
  rateType:       "NIGHTLY" | "WEEKLY"
  pricePerNight:  number
  nights:         number
  subtotal:       number
  taxInclusive:   boolean
  amenities:      { name: string; icon: string | null }[]
  minNights:      number
}

export interface AvailabilityResponse {
  checkIn:             string
  checkOut:            string
  nights:              number
  occupancyType:       string
  results:             AvailableResult[]
  taxes:               { name: string; rate: number; taxType: string }[]
  requiresQuote:       boolean
  requiresQuoteReason?: "LONG_STAY"
  groupMode:           boolean
  groupGuestsRequired: number
}
```

---

**`availability.repository.ts` — implement these functions:**

```typescript
// ── Helpers ─────────────────────────────────────────────────────────
calculateNights(checkIn: Date, checkOut: Date): number
  → Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)

// ── Conflict detection (all return IDs to exclude) ───────────────────

getBookedRoomIds(checkIn: Date, checkOut: Date): Promise<string[]>
  // Find ROOM-level BookingItems WHERE:
  //   Booking.status IN (PENDING, CONFIRMED, CHECKED_IN)
  //   AND Booking.checkIn < checkOut AND Booking.checkOut > checkIn
  // ALSO: find UNIT-level bookings in same date range
  //   → for each, query ALL roomIds belonging to those unitIds
  // Return combined, deduplicated array

getBookedUnitIds(checkIn: Date, checkOut: Date): Promise<string[]>
  // Find UNIT-level BookingItems in same date range (same status filter)
  // ALSO: find ROOM-level bookings → get their parent unitIds
  // Return combined, deduplicated array

getLockedRoomIds(checkIn: Date, checkOut: Date): Promise<string[]>
  // InventoryLock WHERE targetType=ROOM
  //   AND checkIn < checkOut AND checkOut > checkIn
  //   AND expiresAt > NOW()

getLockedUnitIds(checkIn: Date, checkOut: Date): Promise<string[]>
  // Same but targetType=UNIT

getMaintenanceRoomIds(checkIn: Date, checkOut: Date): Promise<string[]>
  // MaintenanceBlock WHERE targetType=ROOM
  //   AND startDate <= checkOut AND endDate >= checkIn
  // ALSO: targetType=PROPERTY → get all roomIds from those properties

getMaintenanceUnitIds(checkIn: Date, checkOut: Date): Promise<string[]>
  // Same for UNIT and PROPERTY → all unitIds

// ── Inventory search ─────────────────────────────────────────────────

searchAvailableRooms(params: {
  maxOccupancy?: number   // OPTIONAL — omit in group mode to return all
  hasAC?: boolean
  excludeRoomIds: string[]
  excludeUnitIds: string[]
}): Promise<Room[]>
  // WHERE isActive=true AND status=ACTIVE
  //   AND unit.isActive=true AND unit.status=ACTIVE
  //   AND unit.property.isActive=true
  //   AND id NOT IN excludeRoomIds
  //   AND unitId NOT IN excludeUnitIds
  //   AND maxOccupancy = params.maxOccupancy   ← only if defined
  //   AND hasAC = params.hasAC                ← only if defined
  // Include: unit{unitNumber,floor,property{name}}, amenities{amenity}, pricing

searchAvailableUnits(params: {
  guests: number          // minimum capacity (sum of room.maxOccupancy)
  excludeUnitIds: string[]
}): Promise<Unit[]>
  // WHERE isActive=true AND status=ACTIVE AND property.isActive=true
  //   AND id NOT IN excludeUnitIds
  // Post-filter in JS:
  //   keep units where rooms.reduce((s,r) => s + r.maxOccupancy, 0) >= guests
  // NOTE: totalCapacity is COMPUTED — do NOT filter by it in SQL
  // Include: rooms{roomNumber,hasAC,maxOccupancy,pricing}, amenities, property

searchAllAvailableUnits(params: {
  excludeUnitIds: string[]
}): Promise<Unit[]>
  // Same as searchAvailableUnits but with NO capacity filter
  // Returns ALL available units — used exclusively in group mode
```

---

**`availability.service.ts`:**

```typescript
// ── Rate selection ─────────────────────────────────────────────────
selectRate(
  rates: RoomPricing[],
  nights: number,
  pricingTier: string
): { rate: RoomPricing | null; requiresQuote: boolean; reason?: string }

  1. if nights >= 30: return { rate: null, requiresQuote: true, reason: "LONG_STAY" }
  2. Filter by pricingTier; if no match fall back to STANDARD
  3. if nights >= 7: find WEEKLY rate → if found return it
  4. Find NIGHTLY rate → return it
  5. if rate.minNights > nights: return { rate: null, requiresQuote: false }  // skip room
  6. No rate: return { rate: null, requiresQuote: false }

// ── Result builders ────────────────────────────────────────────────
buildRoomResult(room, rate, nights): AvailableResult
  → {
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
      rateType: rate.rateType,
      pricePerNight: Number(rate.price),
      nights,
      subtotal: Number(rate.price) * nights,
      taxInclusive: rate.taxInclusive,
      amenities: room.amenities.map(a => ({ name: a.amenity.name, icon: a.amenity.icon })),
      minNights: rate.minNights
    }

buildUnitResult(unit, rate, nights): AvailableResult
  → {
      targetType: "UNIT",
      id: unit.id,
      label: `Unit ${unit.unitNumber} — ${unit.property.name} (Whole Apartment)`,
      propertyName: unit.property.name,
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      hasAC: unit.rooms.some(r => r.hasAC),
      maxOccupancy: unit.rooms.reduce((s,r) => s + r.maxOccupancy, 0),
      totalCapacity: unit.rooms.reduce((s,r) => s + r.maxOccupancy, 0),
      occupancyLabel: "Whole Apartment",
      rooms: unit.rooms.map(r => ({
        roomNumber: r.roomNumber, hasAC: r.hasAC, maxOccupancy: r.maxOccupancy
      })),
      rateType: rate.rateType,
      pricePerNight: Number(rate.price),
      nights,
      subtotal: Number(rate.price) * nights,
      taxInclusive: rate.taxInclusive,
      amenities: unit.amenities.map(a => ({ name: a.amenity.name, icon: a.amenity.icon })),
      minNights: rate.minNights
    }

// ── Main search function ───────────────────────────────────────────
searchAvailability(params): Promise<AvailabilityResponse>

  1. Parse dates:
     checkInDate  = new Date(params.checkIn  + 'T00:00:00')  // ← avoids UTC offset bugs
     checkOutDate = new Date(params.checkOut + 'T00:00:00')

  2. nights = calculateNights(checkInDate, checkOutDate)

  3. Early return for 30+ nights:
     if (nights >= 30) return {
       requiresQuote: true, requiresQuoteReason: "LONG_STAY",
       groupMode: false, groupGuestsRequired: 0,
       results: [], nights, checkIn, checkOut, occupancyType, taxes: []
     }

  4. Fetch all exclusions in parallel:
     const [
       bookedRoomIds, bookedUnitIds,
       lockedRoomIds, lockedUnitIds,
       maintRoomIds,  maintUnitIds,
       activeTaxes
     ] = await Promise.all([...seven parallel queries...])

  5. Combine:
     excludeRoomIds = [...new Set([...bookedRoomIds, ...lockedRoomIds, ...maintRoomIds])]
     excludeUnitIds = [...new Set([...bookedUnitIds, ...lockedUnitIds, ...maintUnitIds])]

  6. Branch on occupancyType:

     // SINGLE or DOUBLE:
     maxOccupancy = occupancyType === "single" ? 1 : 2
     rooms = await searchAvailableRooms({ maxOccupancy, hasAC, excludeRoomIds, excludeUnitIds })
     results = rooms.flatMap(room => {
       const { rate, requiresQuote } = selectRate(room.pricing, nights, pricingTier)
       if (!rate || requiresQuote) return []
       return [buildRoomResult(room, rate, nights)]
     })
     return { ..., results: results.sort((a,b) => a.pricePerNight - b.pricePerNight),
              groupMode: false, groupGuestsRequired: 0 }

     // UNIT — attempt 1: one apartment fits all:
     const fittingUnits = await searchAvailableUnits({ guests: params.guests!, excludeUnitIds })
     if (fittingUnits.length > 0) {
       results = fittingUnits.flatMap(unit => {
         const { rate, requiresQuote } = selectRate(unit.pricing, nights, pricingTier)
         if (!rate || requiresQuote) return []
         return [buildUnitResult(unit, rate, nights)]
       })
       return { ..., results: results.sort((a,b) => a.pricePerNight - b.pricePerNight),
                groupMode: false, groupGuestsRequired: params.guests! }
     }

     // UNIT — attempt 2: GROUP MODE (no single unit fits):
     const [allUnits, allRooms] = await Promise.all([
       searchAllAvailableUnits({ excludeUnitIds }),
       searchAvailableRooms({ excludeRoomIds, excludeUnitIds })  // no maxOccupancy filter
     ])
     const unitResults = allUnits.flatMap(unit => {
       const { rate, requiresQuote } = selectRate(unit.pricing, nights, pricingTier)
       if (!rate || requiresQuote) return []
       return [buildUnitResult(unit, rate, nights)]
     }).sort((a,b) => b.totalCapacity - a.totalCapacity)  // largest first

     const roomResults = allRooms.flatMap(room => {
       const { rate, requiresQuote } = selectRate(room.pricing, nights, pricingTier)
       if (!rate || requiresQuote) return []
       return [buildRoomResult(room, rate, nights)]
     }).sort((a,b) => a.pricePerNight - b.pricePerNight)  // cheapest first

     return {
       ..., results: [...unitResults, ...roomResults],
       groupMode: true, groupGuestsRequired: params.guests!
     }
```

**`availability.routes.ts`:** `GET /` → PUBLIC, no auth required.
**Register in `src/app.ts`:** `app.use(\`${API_PREFIX}/availability\`, availabilityRouter)`

---

## PHASE 4 — Booking Engine

### STEP 4A — Inventory Lock Module

**Repo: `sb-backend`** | **Time: 0.5 sessions**

**Read first:** `prisma/schema.prisma` — InventoryLock model.

Create `src/modules/inventory-locks/`:

**`inventory-locks.schema.ts`:**
```typescript
export const acquireLockSchema = z.object({
  targetType: z.enum(["ROOM","UNIT"]),
  targetId:   z.string().uuid(),
  checkIn:    z.string().refine(v => !isNaN(Date.parse(v))),
  checkOut:   z.string().refine(v => !isNaN(Date.parse(v)))
})
```

**`inventory-locks.service.ts`:**
```typescript
acquireLock(data):
  1. cleanExpiredLocks()   // ← always clean first
  2. Check for existing unexpired lock:
     WHERE targetType = data.targetType
       AND (roomId = data.targetId OR unitId = data.targetId)
       AND checkIn < data.checkOut AND checkOut > data.checkIn  // ← overlap condition
       AND expiresAt > NOW()
     if found: throw 409 "ALREADY_LOCKED"
               "Someone is completing a booking — try in a moment"
  3. sessionKey = crypto.randomUUID()
  4. expiresAt  = new Date(Date.now() + 10 * 60 * 1000)  // exactly 10 minutes
  5. Create InventoryLock {
       sessionKey, targetType,
       roomId: targetType === "ROOM" ? data.targetId : null,
       unitId: targetType === "UNIT" ? data.targetId : null,
       checkIn: new Date(data.checkIn + 'T00:00:00'),
       checkOut: new Date(data.checkOut + 'T00:00:00'),
       expiresAt
     }
  6. Return { sessionKey, expiresAt }

releaseLock(sessionKey: string):
  // Idempotent — no error if not found
  prisma.inventoryLock.deleteMany({ where: { sessionKey } })

cleanExpiredLocks():
  prisma.inventoryLock.deleteMany({ where: { expiresAt: { lt: new Date() } } })
```

**Routes:**
```
POST /              → PUBLIC
DELETE /:sessionKey → PUBLIC
```

Register in `src/app.ts`.

---

### STEP 4B — Bookings Module

**Repo: `sb-backend`** | **Time: 2 sessions** ← complex — read all files first

**Read first:**
- `src/modules/inventory-locks/inventory-locks.service.ts`
- `src/modules/room-pricing/room-pricing.repository.ts`
- `src/modules/coupons/coupons.service.ts`
- `src/modules/taxes/taxes.repository.ts`
- `src/modules/availability/availability.service.ts` — reuse `selectRate`

Create `src/modules/bookings/`:

**`bookings.schema.ts`:**
```typescript
export const createBookingSchema = z.object({
  sessionKeys:   z.array(z.string().uuid()).min(1).max(10),  // always array
  occupancyType: z.enum(["single","double","unit"]),
  items: z.array(z.object({
    targetType: z.enum(["ROOM","UNIT"]),
    roomId:     z.string().uuid().optional(),
    unitId:     z.string().uuid().optional()
  })).min(1).max(10),
  checkIn:    z.string().refine(v => !isNaN(Date.parse(v))),
  checkOut:   z.string().refine(v => !isNaN(Date.parse(v))),
  guests:     z.number().int().min(1).max(20),
  couponCode: z.string().optional(),
  notes:      z.string().max(500).optional()
}).superRefine((data, ctx) => {
  if (Date.parse(data.checkOut) <= Date.parse(data.checkIn))
    ctx.addIssue({ code:"custom", message:"checkOut must be after checkIn", path:["checkOut"] })
  for (const item of data.items) {
    if (item.targetType === "ROOM" && !item.roomId)
      ctx.addIssue({ code:"custom", message:"roomId required when targetType=ROOM", path:["items"] })
    if (item.targetType === "UNIT" && !item.unitId)
      ctx.addIssue({ code:"custom", message:"unitId required when targetType=UNIT", path:["items"] })
  }
})

export const updateStatusSchema = z.object({
  status: z.enum(["CONFIRMED","CHECKED_IN","CHECKED_OUT","CANCELLED"])
})
```

**`bookings.repository.ts` — key functions:**
```typescript
generateBookingRef(year: number): Promise<string>
  // count = bookings created this calendar year
  // return `SCH-${year}-${String(count + 1).padStart(4, "0")}`
  // e.g. "SCH-2026-0001"

findById(id: string)          // include: items + user
findAll(filters)              // admin — paginated, search by name/email/ref
findByUser(userId, filters)   // guest — their own bookings only

create(data): Booking          // MUST use prisma.$transaction

hasConflictForRoom(roomId, unitId, checkIn, checkOut): Promise<boolean>
  // BookingItem.targetType=ROOM AND roomId=X → Booking overlaps dates
  // OR BookingItem.targetType=UNIT AND unitId=parentUnitId → Booking overlaps
  // Status IN (PENDING, CONFIRMED, CHECKED_IN)

hasConflictForUnit(unitId, allRoomIds: string[], checkIn, checkOut): Promise<boolean>
  // BookingItem.targetType=UNIT AND unitId=X
  // OR BookingItem.targetType=ROOM AND roomId IN allRoomIds
  // Status + date overlap check

updateStatus(id: string, newStatus: string): Booking
  // Valid transitions (throw 400 "INVALID_STATUS_TRANSITION" for all others):
  // PENDING    → CONFIRMED or CANCELLED
  // CONFIRMED  → CHECKED_IN or CANCELLED
  // CHECKED_IN → CHECKED_OUT

incrementCouponUsage(couponId: string): void
```

**`bookings.service.ts` — createBooking(userId, input):**
```typescript
STEP 0:  cleanExpiredLocks()

STEP 1:  Validate ALL session locks exist and are not expired:
         for each key in input.sessionKeys:
           lock = await findLock(key)
           if (!lock || lock.expiresAt < new Date())
             throw 400 "LOCK_EXPIRED" "Your reservation expired. Please start over."

STEP 2:  nights = calculateNights(checkIn, checkOut)

STEP 3:  Determine bookingType:
         if (nights >= 7)            bookingType = "LONG_STAY"
         else if (items.length > 1)  bookingType = "MULTI_ROOM"
         else if (items[0].targetType === "UNIT") bookingType = "UNIT"
         else                        bookingType = "ROOM"

STEP 4:  For each item, build BookingItemData:
         a. Find target:
            ROOM: findRoom(roomId)   → 404 if not found or isActive=false
            UNIT: findUnit(unitId)   → 404 if not found or isActive=false
         b. Get active rates:
            rates = findActiveRatesForRoom/Unit(targetId, checkInDate)
            { rate, requiresQuote } = selectRate(rates, nights, "STANDARD")
            if requiresQuote: throw 400 "REQUIRES_QUOTE"
            if !rate: throw 400 "NO_PRICING" "No pricing available for this room and dates"
         c. Conflict check:
            ROOM: hasConflict = hasConflictForRoom(roomId, room.unitId, checkIn, checkOut)
            UNIT: allRoomIds = unit.rooms.map(r => r.id)
                  hasConflict = hasConflictForUnit(unitId, allRoomIds, checkIn, checkOut)
            if hasConflict: throw 409 "CONFLICT" "This room is no longer available"
         d. subtotal = Number(rate.price) * nights
         e. Build item: { targetType, roomId?, unitId?, pricingId: rate.id,
                          rateType: rate.rateType, pricePerNight: rate.price,
                          nights, subtotal, label }

STEP 5:  bookingSubtotal = sum(item.subtotal)

STEP 6:  Apply coupon (if provided):
         result = validateCoupon(couponCode, nights, bookingSubtotal)
         discountAmount = result.discountAmount
         couponId = result.couponId

STEP 7:  discountedTotal = bookingSubtotal - discountAmount

STEP 8:  Get active taxes, calculate:
         taxAmount = 0
         for each tax (PERCENTAGE): taxAmount += discountedTotal × (tax.rate / 100)
         for each tax (FIXED):      taxAmount += Number(tax.rate)

STEP 9:  totalAmount = discountedTotal + taxAmount

STEP 10: user = findUserById(userId)
         guestName  = user.fullName
         guestEmail = user.email
         guestPhone = user.contactNumber ?? ""

STEP 11: bookingRef = await generateBookingRef(new Date().getFullYear())

STEP 12: Create in $transaction:
         booking = prisma.booking.create({ data: { ...allFields, items: { create: allItems } } })

STEP 13: Release ALL locks after transaction:
         await Promise.all(input.sessionKeys.map(key => releaseLock(key)))

STEP 14: If couponId: incrementCouponUsage(couponId)

STEP 15: Return booking DTO with items

cancelBooking(id, requestingUserId, role):
  booking = findById(id)  → 404 if not found
  if booking.userId !== requestingUserId && role NOT IN ["ADMIN","MANAGER"]: throw 403
  if booking.status NOT IN ["PENDING","CONFIRMED"]: throw 400 "CANNOT_CANCEL"
  updateStatus(id, "CANCELLED")
```

**Routes:**
```
POST /            → authenticate           (create booking)
GET /my           → authenticate           (guest's own bookings)
GET /:id          → authenticate           (single booking — owner or admin)
GET /             → authenticate + authorize([ADMIN, MANAGER])
PATCH /:id/status → authenticate + authorize([ADMIN, MANAGER])
DELETE /:id       → authenticate           (cancel)
```

Register in `src/app.ts`.

---

### STEP 4C — Enquiries, Quotes & Dashboard

**Repo: `sb-backend`** | **Time: 1 session**

**Read first:** `src/modules/amenities/`, `src/common/email/mailer.ts`

#### Part A — Enquiries (`src/modules/enquiries/`):
```typescript
createEnquirySchema = z.object({
  name:          z.string().min(1).max(100),
  email:         z.string().email(),
  contactNumber: z.string().min(6).max(20).regex(/^[0-9]+$/),
  message:       z.string().min(10).max(1000),
  source:        z.string().optional()
})

updateEnquiryStatusSchema = z.object({
  status: z.enum(["NEW","READ","REPLIED","CLOSED"])
})
```

On create: save with `status="NEW"`, send confirmation email to enquirer.
Routes: `POST /` → PUBLIC. All else → Admin/Manager.

---

#### Part B — Quotes (`src/modules/quotes/`):
```typescript
createQuoteSchema = z.object({
  name:              z.string().min(1).max(100),
  email:             z.string().email(),
  contactNumber:     z.string().min(6).max(20).regex(/^[0-9]+$/),
  company:           z.string().max(100).optional(),
  guests:            z.number().int().min(1).max(50),
  bookingPreference: z.enum(["ROOM","UNIT","MULTI_ROOM"]),
  checkIn:           z.string().refine(validDate),
  checkOut:          z.string().refine(validDate),
  notes:             z.string().max(500).optional()
}).superRefine((data, ctx) => {
  const nights = Math.round((Date.parse(data.checkOut) - Date.parse(data.checkIn)) / 86400000)
  if (nights < 30)
    ctx.addIssue({ code:"custom",
      message:"Quote requests are for stays of 30+ nights", path:["checkOut"] })
})
```

Routes: `POST /` → PUBLIC. All else → Admin/Manager.

---

#### Part C — Dashboard (`src/modules/dashboard/`):

Single `GET /api/dashboard` → Admin/Manager only. Run ALL in `Promise.all`:
```typescript
const [
  bookingStats,    // total, by status, totalRevenue (CONFIRMED + CHECKED_IN + CHECKED_OUT)
  todayCheckIns,   // count WHERE checkIn=today AND status=CONFIRMED
  occupancy,       // totalRooms, totalUnits, occupiedToday counts
  recentBookings,  // last 5, include user.fullName
  enquiryStats,    // total, newCount (status=NEW)
  quoteStats,      // total, pendingCount (status=PENDING)
  userStats        // total GUEST users, new this month
] = await Promise.all([...])
```

Register all three in `src/app.ts`.

---

## Build Order Summary

```
STEP 0    Schema migration
          → npx prisma migrate dev --name booking_system_final
          → npx prisma generate
          → ZERO errors required before proceeding

STEP 1A   Rooms module
STEP 1B   Maintenance Blocks module

STEP 2A   Room Products + Room Pricing
STEP 2B   Taxes module
STEP 2C   Coupons module

STEP 3A   Availability Engine (2 sessions)

STEP 4A   Inventory Locks
STEP 4B   Bookings (2 sessions)
STEP 4C   Enquiries + Quotes + Dashboard

← TEST ALL WITH POSTMAN BEFORE FRONTEND →
```

---

## Postman Test Checklist

### After Phase 1:
```
POST /api/rooms { unitId, roomNumber:"2B", hasAC:true, maxOccupancy:1 }
  → 201, { occupancyLabel: "Single" }

POST /api/rooms { unitId, roomNumber:"2B", ... }  // duplicate
  → 409 ROOM_EXISTS

GET /api/rooms?maxOccupancy=1  → only single rooms returned
GET /api/rooms?maxOccupancy=2  → only double rooms returned

POST /api/maintenance-blocks { targetType:"ROOM", roomId:X, startDate, endDate }
  → 201

POST /api/maintenance-blocks { targetType:"ROOM" }  // missing roomId
  → 400 validation error
```

### After Phase 2:
```
POST /api/room-products { name:"Single AC Nightly", occupancy:1, hasAC:true, category:"NIGHTLY" }
POST /api/room-pricing { productId, roomId, rateType:"NIGHTLY", price:1750, validFrom:"2026-01-01" }
POST /api/room-pricing { productId, roomId, rateType:"WEEKLY",  price:1500, minNights:7, validFrom:"2026-01-01" }
POST /api/taxes { name:"GST", rate:12, taxType:"PERCENTAGE", appliesTo:"ALL" }
POST /api/coupons { code:"WELCOME10", name:"10% off", discountType:"PERCENTAGE", discountValue:10,
  validFrom:"2026-01-01", minNights:3 }

POST /api/coupons/validate { code:"WELCOME10", checkIn:"2026-04-01", checkOut:"2026-04-04", subtotal:5250 }
  → 200 { discountAmount: 525 }

POST /api/coupons/validate { code:"WELCOME10", checkIn:"2026-04-01", checkOut:"2026-04-02", subtotal:1750 }
  → 400 COUPON_MIN_NIGHTS "Minimum 3 nights required"
```

### After Phase 3:
```
GET /api/availability?occupancyType=single&checkIn=2026-04-01&checkOut=2026-04-05
  → results only WHERE maxOccupancy=1

GET /api/availability?occupancyType=double&checkIn=2026-04-01&checkOut=2026-04-05
  → results only WHERE maxOccupancy=2

GET /api/availability?occupancyType=unit&guests=4&checkIn=2026-04-01&checkOut=2026-04-05
  → { groupMode:false, results: [units with capacity >= 4] }

GET /api/availability?occupancyType=unit&guests=7&checkIn=2026-04-01&checkOut=2026-04-05
  → { groupMode:true, groupGuestsRequired:7,
      results: [UNIT items first (cap desc), then ROOM items (price asc)] }

GET /api/availability?occupancyType=single&checkIn=2026-04-01&checkOut=2026-04-08  // 7 nights
  → results use WEEKLY rate (₹1500) not NIGHTLY (₹1750) ✓

GET /api/availability?occupancyType=single&checkIn=2026-04-01&checkOut=2026-05-15  // 44 nights
  → { requiresQuote:true, results:[] } ✓

// After creating MaintenanceBlock for Room A on Apr 1–5:
GET /api/availability?occupancyType=single&checkIn=2026-04-01&checkOut=2026-04-05
  → Room A NOT in results ✓
```

### After Phase 4:
```
// Single booking flow:
POST /api/locks { targetType:"ROOM", targetId:roomA, checkIn:"2026-04-01", checkOut:"2026-04-05" }
  → { sessionKey:"uuid-1", expiresAt }

POST /api/locks (same room, overlapping dates)
  → 409 ALREADY_LOCKED ✓

POST /api/bookings {
  sessionKeys: ["uuid-1"],
  occupancyType:"single",
  items: [{ targetType:"ROOM", roomId:roomA }],
  checkIn:"2026-04-01", checkOut:"2026-04-05", guests:1
}
  → { bookingRef:"SCH-2026-0001", bookingType:"ROOM",
      subtotal:7000, taxAmount:840, totalAmount:7840, status:"PENDING" }
  // 4 nights × ₹1750 = ₹7000 + 12% GST = ₹7840 ✓

GET /api/availability?occupancyType=single&checkIn=2026-04-01&checkOut=2026-04-05
  → Room A NOT in results ✓

// Group booking flow:
POST /api/locks { targetType:"UNIT", targetId:unit3A, ... } → { sessionKey:"uuid-1" }
POST /api/locks { targetType:"ROOM", targetId:room2B, ... } → { sessionKey:"uuid-2" }

POST /api/bookings {
  sessionKeys: ["uuid-1","uuid-2"],
  occupancyType:"unit",
  items: [{ targetType:"UNIT", unitId:unit3A }, { targetType:"ROOM", roomId:room2B }],
  checkIn:"2026-04-01", checkOut:"2026-04-05", guests:7
}
  → { bookingType:"MULTI_ROOM", guests:7,
      items: [ {label:"Unit 3A..."}, {label:"Room 2B..."} ] } ✓

// Status transitions:
PATCH /api/bookings/{id}/status { status:"CONFIRMED" }  → 200 ✓
PATCH /api/bookings/{id}/status { status:"PENDING" }    → 400 INVALID_STATUS_TRANSITION ✓
PATCH /api/bookings/{id}/status { status:"CHECKED_IN" } → 200 ✓
PATCH /api/bookings/{id}/status { status:"CANCELLED" }  → 400 (already CHECKED_IN) ✓

// Quote validation:
POST /api/quotes { ...checkIn:"2026-04-01", checkOut:"2026-04-15" }  // 14 nights
  → 400 "Quote requests are for stays of 30+ nights" ✓

POST /api/quotes { ...checkIn:"2026-04-01", checkOut:"2026-05-15" }  // 44 nights
  → 201 (public endpoint — no login required) ✓
```

---

## Common Bugs to Avoid

| Bug | Fix |
|---|---|
| `new Date("2026-04-01")` parses as UTC midnight → wrong local day | Use `new Date("2026-04-01T00:00:00")` |
| `totalCapacity` filtered in SQL | It's computed — post-filter in JS |
| `POST /validate` after `/:id` in routes | Define `/validate` first |
| Locks released before `$transaction` commits | Release AFTER transaction resolves |
| `getBookedRoomIds` only checks direct bookings | Also check unit-level bookings |
| MULTI_ROOM check before LONG_STAY in bookingType | LONG_STAY must be checked first |
| Coupon FIXED discount exceeds subtotal | Cap with `Math.min(discountValue, subtotal)` |
