-- AlterTable
ALTER TABLE `branches` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `branches_isActive_idx` ON `branches`(`isActive`);
