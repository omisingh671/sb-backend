/*
  Warnings:

  - You are about to drop the column `pricePerNight` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `targetLabel` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `unitId` on the `bookings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bookingRef]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookingRef` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingType` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestEmail` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestName` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestPhone` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guests` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nights` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `quote_requests` DROP FOREIGN KEY `fk_quote_user`;

-- AlterTable
ALTER TABLE `bookings` DROP COLUMN `pricePerNight`,
    DROP COLUMN `productId`,
    DROP COLUMN `productName`,
    DROP COLUMN `roomId`,
    DROP COLUMN `targetLabel`,
    DROP COLUMN `targetType`,
    DROP COLUMN `unitId`,
    ADD COLUMN `bookingRef` VARCHAR(191) NOT NULL,
    ADD COLUMN `bookingType` ENUM('ROOM', 'UNIT', 'MULTI_ROOM', 'LONG_STAY', 'CORPORATE') NOT NULL,
    ADD COLUMN `couponCode` VARCHAR(191) NULL,
    ADD COLUMN `couponId` VARCHAR(191) NULL,
    ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `guestEmail` VARCHAR(191) NOT NULL,
    ADD COLUMN `guestName` VARCHAR(191) NOT NULL,
    ADD COLUMN `guestPhone` VARCHAR(191) NOT NULL,
    ADD COLUMN `guests` INTEGER NOT NULL,
    ADD COLUMN `nights` INTEGER NOT NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `subtotal` DECIMAL(65, 30) NOT NULL,
    ADD COLUMN `taxAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `quote_requests` MODIFY `userId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `room_pricing` ADD COLUMN `maxNights` INTEGER NULL,
    ADD COLUMN `minNights` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `pricingTier` ENUM('STANDARD', 'CORPORATE', 'SEASONAL') NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN `rateType` ENUM('NIGHTLY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'NIGHTLY',
    ADD COLUMN `taxInclusive` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX `bookings_bookingRef_key` ON `bookings`(`bookingRef`);

-- CreateIndex
CREATE INDEX `bookings_status_idx` ON `bookings`(`status`);

-- CreateIndex
CREATE INDEX `bookings_checkIn_checkOut_idx` ON `bookings`(`checkIn`, `checkOut`);

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `fk_quote_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `fk_booking_coupon` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `fk_item_booking` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `fk_item_room` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `fk_item_unit` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
