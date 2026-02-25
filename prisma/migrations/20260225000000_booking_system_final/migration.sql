-- AlterEnum: room_products.category — add ROOM and UNIT values
ALTER TABLE `room_products` MODIFY COLUMN `category` ENUM('ROOM', 'UNIT', 'NIGHTLY', 'LONG_STAY', 'CORPORATE') NOT NULL;

-- AlterTable: room_pricing — add rateType, pricingTier, minNights, maxNights, taxInclusive
ALTER TABLE `room_pricing`
    ADD COLUMN `rateType` ENUM('NIGHTLY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'NIGHTLY' AFTER `productId`,
    ADD COLUMN `pricingTier` ENUM('STANDARD', 'CORPORATE', 'SEASONAL') NOT NULL DEFAULT 'STANDARD' AFTER `rateType`,
    ADD COLUMN `minNights` INTEGER NOT NULL DEFAULT 1 AFTER `pricingTier`,
    ADD COLUMN `maxNights` INTEGER NULL AFTER `minNights`,
    ADD COLUMN `taxInclusive` BOOLEAN NOT NULL DEFAULT false AFTER `maxNights`;

-- AlterTable: quote_requests — make userId nullable
ALTER TABLE `quote_requests` DROP FOREIGN KEY `fk_quote_user`;
ALTER TABLE `quote_requests` MODIFY COLUMN `userId` VARCHAR(191) NULL;

-- Drop old bookings table (structure incompatible with new schema)
ALTER TABLE `bookings` DROP FOREIGN KEY `fk_booking_user`;
DROP TABLE `bookings`;

-- CreateTable: coupons (must exist before bookings references it)
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
    `discountValue` DECIMAL(65, 30) NOT NULL,
    `maxUses` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `minNights` INTEGER NULL,
    `minAmount` DECIMAL(65, 30) NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `coupons_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: bookings (new structure)
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `bookingRef` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bookingType` ENUM('ROOM', 'UNIT', 'MULTI_ROOM', 'LONG_STAY', 'CORPORATE') NOT NULL,
    `guestName` VARCHAR(191) NOT NULL,
    `guestEmail` VARCHAR(191) NOT NULL,
    `guestPhone` VARCHAR(191) NOT NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `nights` INTEGER NOT NULL,
    `guests` INTEGER NOT NULL,
    `subtotal` DECIMAL(65, 30) NOT NULL,
    `taxAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(65, 30) NOT NULL,
    `couponId` VARCHAR(191) NULL,
    `couponCode` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_bookingRef_key`(`bookingRef`),
    INDEX `bookings_userId_idx`(`userId`),
    INDEX `bookings_status_idx`(`status`),
    INDEX `bookings_checkIn_checkOut_idx`(`checkIn`, `checkOut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: booking_items
CREATE TABLE `booking_items` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NULL,
    `unitId` VARCHAR(191) NULL,
    `pricingId` VARCHAR(191) NULL,
    `rateType` VARCHAR(191) NOT NULL,
    `pricePerNight` DECIMAL(65, 30) NOT NULL,
    `nights` INTEGER NOT NULL,
    `subtotal` DECIMAL(65, 30) NOT NULL,
    `label` VARCHAR(191) NOT NULL,

    INDEX `booking_items_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: taxes
CREATE TABLE `taxes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(65, 30) NOT NULL,
    `taxType` ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
    `appliesTo` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: inventory_locks
CREATE TABLE `inventory_locks` (
    `id` VARCHAR(191) NOT NULL,
    `sessionKey` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NULL,
    `unitId` VARCHAR(191) NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inventory_locks_sessionKey_key`(`sessionKey`),
    INDEX `inventory_locks_expiresAt_idx`(`expiresAt`),
    INDEX `inventory_locks_roomId_idx`(`roomId`),
    INDEX `inventory_locks_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: maintenance_blocks
CREATE TABLE `maintenance_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NULL,
    `unitId` VARCHAR(191) NULL,
    `propertyId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `maintenance_blocks_startDate_endDate_idx`(`startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `fk_quote_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `fk_booking_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `fk_booking_coupon` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `fk_item_booking` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `fk_item_room` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `fk_item_unit` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
