-- AlterTable
ALTER TABLE `products` ADD COLUMN `inventoryAccountId` VARCHAR(191) NULL,
    ADD COLUMN `inventoryValuationMethod` VARCHAR(191) NOT NULL DEFAULT 'FIFO';

-- CreateTable
CREATE TABLE `bank_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `transactionType` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `runningBalance` DECIMAL(12, 2) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `counterparty` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `journalId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'completed',
    `bankReference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bank_transactions_bankAccountId_idx`(`bankAccountId`),
    INDEX `bank_transactions_organizationId_idx`(`organizationId`),
    INDEX `bank_transactions_transactionDate_idx`(`transactionDate`),
    INDEX `bank_transactions_transactionType_idx`(`transactionType`),
    INDEX `bank_transactions_invoiceId_fkey`(`invoiceId`),
    INDEX `bank_transactions_journalId_fkey`(`journalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Myanmar',
    `phone` VARCHAR(191) NULL,
    `fax` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `defaultTransactionSeries` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `branches_organizationId_idx`(`organizationId`),
    INDEX `branches_isDefault_idx`(`isDefault`),
    INDEX `branches_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `oaVendorId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `vendorType` VARCHAR(191) NOT NULL DEFAULT 'supplier',
    `industry` VARCHAR(191) NULL,
    `paymentTerms` VARCHAR(191) NULL DEFAULT 'net30',
    `taxId` VARCHAR(191) NULL,
    `address` JSON NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastContactAt` DATETIME(3) NULL,
    `companyId` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `displayName` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `openingBalance` DECIMAL(12, 2) NULL,
    `openingBalanceAccount` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `remarks` TEXT NULL,
    `salutation` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,

    UNIQUE INDEX `vendors_oaVendorId_key`(`oaVendorId`),
    INDEX `vendors_currency_idx`(`currency`),
    INDEX `vendors_organizationId_idx`(`organizationId`),
    INDEX `vendors_vendorType_idx`(`vendorType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `oaInvoiceId` VARCHAR(191) NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `terms` VARCHAR(191) NOT NULL DEFAULT 'Due on Receipt',
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `discountPercent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `shippingCharges` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `adjustment` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balanceDue` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `location` VARCHAR(191) NULL,
    `warehouse` VARCHAR(191) NULL,
    `salespersonId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `customerNotes` TEXT NULL,
    `termsConditions` TEXT NULL,
    `journalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_oaInvoiceId_key`(`oaInvoiceId`),
    UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
    UNIQUE INDEX `invoices_journalId_key`(`journalId`),
    INDEX `invoices_organizationId_idx`(`organizationId`),
    INDEX `invoices_customerId_idx`(`customerId`),
    INDEX `invoices_salespersonId_idx`(`salespersonId`),
    INDEX `invoices_branchId_idx`(`branchId`),
    INDEX `invoices_status_idx`(`status`),
    INDEX `invoices_issueDate_idx`(`issueDate`),
    INDEX `invoices_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `rate` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discountPercent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `taxId` VARCHAR(191) NULL,
    `taxPercent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `amount` DECIMAL(12, 2) NOT NULL,
    `salesAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    INDEX `invoice_items_productId_idx`(`productId`),
    INDEX `invoice_items_taxId_idx`(`taxId`),
    INDEX `invoice_items_salesAccountId_fkey`(`salesAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_payments` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL,
    `amountReceived` DECIMAL(12, 2) NOT NULL,
    `bankCharges` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `paymentMode` VARCHAR(191) NOT NULL DEFAULT 'cash',
    `depositTo` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `taxDeducted` BOOLEAN NOT NULL DEFAULT false,
    `tdsAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `journalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoice_payments_paymentNumber_key`(`paymentNumber`),
    UNIQUE INDEX `invoice_payments_journalId_key`(`journalId`),
    INDEX `invoice_payments_invoiceId_idx`(`invoiceId`),
    INDEX `invoice_payments_paymentDate_idx`(`paymentDate`),
    INDEX `invoice_payments_depositTo_idx`(`depositTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journals` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `journalNumber` VARCHAR(191) NOT NULL,
    `journalDate` DATETIME(3) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `totalDebit` DECIMAL(12, 2) NOT NULL,
    `totalCredit` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `journals_journalNumber_key`(`journalNumber`),
    INDEX `journals_organizationId_idx`(`organizationId`),
    INDEX `journals_journalDate_idx`(`journalDate`),
    INDEX `journals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_entries` (
    `id` VARCHAR(191) NOT NULL,
    `journalId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `debitAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `creditAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `journal_entries_journalId_idx`(`journalId`),
    INDEX `journal_entries_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taxes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'standard',
    `isCompound` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `organizationId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `taxes_organizationId_idx`(`organizationId`),
    INDEX `taxes_name_idx`(`name`),
    INDEX `taxes_type_idx`(`type`),
    INDEX `taxes_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salespersons` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `salespersons_email_key`(`email`),
    INDEX `salespersons_organizationId_idx`(`organizationId`),
    INDEX `salespersons_status_idx`(`status`),
    INDEX `salespersons_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouses` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Myanmar',
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `managerName` VARCHAR(191) NULL,
    `managerEmail` VARCHAR(191) NULL,
    `warehouseType` VARCHAR(191) NOT NULL DEFAULT 'standard',
    `capacity` DECIMAL(12, 2) NULL,
    `currentUtilization` DECIMAL(5, 2) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `allowNegativeInventory` BOOLEAN NOT NULL DEFAULT false,
    `autoReorderEnabled` BOOLEAN NOT NULL DEFAULT false,
    `costCenter` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouses_code_key`(`code`),
    INDEX `warehouses_organizationId_idx`(`organizationId`),
    INDEX `warehouses_branchId_idx`(`branchId`),
    INDEX `warehouses_isDefault_idx`(`isDefault`),
    INDEX `warehouses_isActive_idx`(`isActive`),
    INDEX `warehouses_isPrimary_idx`(`isPrimary`),
    INDEX `warehouses_warehouseType_idx`(`warehouseType`),
    UNIQUE INDEX `warehouses_organizationId_name_key`(`organizationId`, `name`),
    UNIQUE INDEX `warehouses_branchId_isPrimary_key`(`branchId`, `isPrimary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_opening_balances` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitCost` DECIMAL(12, 4) NOT NULL,
    `totalValue` DECIMAL(12, 2) NOT NULL,
    `asOfDate` DATETIME(3) NOT NULL,
    `journalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_opening_balances_journalId_key`(`journalId`),
    INDEX `inventory_opening_balances_itemId_idx`(`itemId`),
    INDEX `inventory_opening_balances_warehouseId_idx`(`warehouseId`),
    INDEX `inventory_opening_balances_asOfDate_idx`(`asOfDate`),
    UNIQUE INDEX `inventory_opening_balances_itemId_warehouseId_key`(`itemId`, `warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_layers` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `quantityRemaining` DECIMAL(12, 4) NOT NULL,
    `unitCost` DECIMAL(12, 4) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `batchNumber` VARCHAR(191) NULL,
    `expiryDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_layers_itemId_warehouseId_createdAt_idx`(`itemId`, `warehouseId`, `createdAt`),
    INDEX `inventory_layers_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `inventory_layers_expiryDate_idx`(`expiryDate`),
    INDEX `inventory_layers_warehouseId_fkey`(`warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `layerId` VARCHAR(191) NULL,
    `direction` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitCost` DECIMAL(12, 4) NOT NULL,
    `totalValue` DECIMAL(12, 2) NOT NULL,
    `movementType` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `journalId` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_movements_itemId_warehouseId_createdAt_idx`(`itemId`, `warehouseId`, `createdAt`),
    INDEX `inventory_movements_movementType_idx`(`movementType`),
    INDEX `inventory_movements_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `inventory_movements_journalId_idx`(`journalId`),
    INDEX `inventory_movements_layerId_fkey`(`layerId`),
    INDEX `inventory_movements_warehouseId_fkey`(`warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `permission` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `warehouse_permissions_warehouseId_idx`(`warehouseId`),
    INDEX `warehouse_permissions_userId_idx`(`userId`),
    UNIQUE INDEX `warehouse_permissions_warehouseId_userId_permission_key`(`warehouseId`, `userId`, `permission`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_transfers` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `transferNumber` VARCHAR(191) NOT NULL,
    `fromWarehouseId` VARCHAR(191) NOT NULL,
    `toWarehouseId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `transferDate` DATETIME(3) NOT NULL,
    `expectedDate` DATETIME(3) NULL,
    `completedDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `totalValue` DECIMAL(12, 2) NOT NULL,
    `journalId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_transfers_transferNumber_key`(`transferNumber`),
    UNIQUE INDEX `inventory_transfers_journalId_key`(`journalId`),
    INDEX `inventory_transfers_organizationId_idx`(`organizationId`),
    INDEX `inventory_transfers_fromWarehouseId_idx`(`fromWarehouseId`),
    INDEX `inventory_transfers_toWarehouseId_idx`(`toWarehouseId`),
    INDEX `inventory_transfers_status_idx`(`status`),
    INDEX `inventory_transfers_transferDate_idx`(`transferDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_transfer_items` (
    `id` VARCHAR(191) NOT NULL,
    `transferId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitCost` DECIMAL(12, 4) NOT NULL,
    `totalValue` DECIMAL(12, 2) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_transfer_items_transferId_idx`(`transferId`),
    INDEX `inventory_transfer_items_itemId_idx`(`itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_number_sequence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transfer_number_sequence_organizationId_year_key`(`organizationId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_keys` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `request_hash` VARCHAR(191) NOT NULL,
    `response_data` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'processing',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `idempotency_keys_organization_id_idx`(`organization_id`),
    INDEX `idempotency_keys_expires_at_idx`(`expires_at`),
    UNIQUE INDEX `idempotency_keys_organization_id_endpoint_idempotency_key_key`(`organization_id`, `endpoint`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reconciliation_runs` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `run_date` DATETIME(3) NOT NULL,
    `run_type` VARCHAR(191) NOT NULL DEFAULT 'daily',
    `status` VARCHAR(191) NOT NULL DEFAULT 'running',
    `trial_balance_status` VARCHAR(191) NULL,
    `inventory_status` VARCHAR(191) NULL,
    `ar_ap_status` VARCHAR(191) NULL,
    `total_debits` DECIMAL(15, 2) NULL,
    `total_credits` DECIMAL(15, 2) NULL,
    `balance_difference` DECIMAL(15, 2) NULL,
    `inventory_gl_value` DECIMAL(15, 2) NULL,
    `inventory_layer_value` DECIMAL(15, 2) NULL,
    `inventory_variance` DECIMAL(15, 2) NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,

    INDEX `reconciliation_runs_organization_id_idx`(`organization_id`),
    INDEX `reconciliation_runs_run_date_idx`(`run_date`),
    INDEX `reconciliation_runs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reconciliation_variances` (
    `id` VARCHAR(191) NOT NULL,
    `reconciliation_run_id` VARCHAR(191) NOT NULL,
    `variance_type` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NULL,
    `item_id` VARCHAR(191) NULL,
    `warehouse_id` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `expected_value` DECIMAL(15, 2) NULL,
    `actual_value` DECIMAL(15, 2) NULL,
    `variance_amount` DECIMAL(15, 2) NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolved_at` DATETIME(3) NULL,
    `resolved_by` VARCHAR(191) NULL,
    `resolution_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reconciliation_variances_reconciliation_run_id_idx`(`reconciliation_run_id`),
    INDEX `reconciliation_variances_variance_type_idx`(`variance_type`),
    INDEX `reconciliation_variances_severity_idx`(`severity`),
    INDEX `reconciliation_variances_resolved_idx`(`resolved`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `fiscal_year_start_month` INTEGER NOT NULL DEFAULT 1,
    `fiscal_year_start_day` INTEGER NOT NULL DEFAULT 1,
    `report_basis` VARCHAR(191) NOT NULL DEFAULT 'accrual',
    `base_currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Yangon',
    `date_format` VARCHAR(191) NOT NULL DEFAULT 'DD/MM/YYYY',
    `allow_negative_inventory` BOOLEAN NOT NULL DEFAULT false,
    `auto_close_periods` BOOLEAN NOT NULL DEFAULT false,
    `retained_earnings_account_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `organization_profiles_organization_id_key`(`organization_id`),
    INDEX `organization_profiles_fiscal_year_start_month_fiscal_year_st_idx`(`fiscal_year_start_month`, `fiscal_year_start_day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounting_periods` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `fiscal_year` INTEGER NOT NULL,
    `period_number` INTEGER NOT NULL,
    `period_name` VARCHAR(191) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `closed_at` DATETIME(3) NULL,
    `closed_by` VARCHAR(191) NULL,
    `reopened_at` DATETIME(3) NULL,
    `reopened_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `accounting_periods_organization_id_idx`(`organization_id`),
    INDEX `accounting_periods_fiscal_year_idx`(`fiscal_year`),
    INDEX `accounting_periods_status_idx`(`status`),
    INDEX `accounting_periods_start_date_end_date_idx`(`start_date`, `end_date`),
    UNIQUE INDEX `accounting_periods_organization_id_fiscal_year_period_number_key`(`organization_id`, `fiscal_year`, `period_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `year_end_closing_runs` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `fiscal_year` INTEGER NOT NULL,
    `closing_date` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `closing_journal_id` VARCHAR(191) NULL,
    `oa_closing_transaction_id` VARCHAR(191) NULL,
    `total_income` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total_expenses` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `net_income` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `retained_earnings_account_id` VARCHAR(191) NOT NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,

    INDEX `year_end_closing_runs_organization_id_idx`(`organization_id`),
    INDEX `year_end_closing_runs_fiscal_year_idx`(`fiscal_year`),
    INDEX `year_end_closing_runs_status_idx`(`status`),
    UNIQUE INDEX `year_end_closing_runs_organization_id_fiscal_year_key`(`organization_id`, `fiscal_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `products_inventoryAccountId_fkey` ON `products`(`inventoryAccountId`);

-- CreateIndex
CREATE INDEX `products_trackInventory_idx` ON `products`(`trackInventory`);

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `journals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_inventoryAccountId_fkey` FOREIGN KEY (`inventoryAccountId`) REFERENCES `ledger_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `journals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_salespersonId_fkey` FOREIGN KEY (`salespersonId`) REFERENCES `salespersons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_salesAccountId_fkey` FOREIGN KEY (`salesAccountId`) REFERENCES `ledger_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_taxId_fkey` FOREIGN KEY (`taxId`) REFERENCES `taxes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_depositTo_fkey` FOREIGN KEY (`depositTo`) REFERENCES `ledger_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `journals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `ledger_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `journals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salespersons` ADD CONSTRAINT `salespersons_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_opening_balances` ADD CONSTRAINT `inventory_opening_balances_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_opening_balances` ADD CONSTRAINT `inventory_opening_balances_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `journals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_opening_balances` ADD CONSTRAINT `inventory_opening_balances_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_layers` ADD CONSTRAINT `inventory_layers_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_layers` ADD CONSTRAINT `inventory_layers_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `journals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_layerId_fkey` FOREIGN KEY (`layerId`) REFERENCES `inventory_layers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_permissions` ADD CONSTRAINT `warehouse_permissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_permissions` ADD CONSTRAINT `warehouse_permissions_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_fromWarehouseId_fkey` FOREIGN KEY (`fromWarehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `journals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_toWarehouseId_fkey` FOREIGN KEY (`toWarehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer_items` ADD CONSTRAINT `inventory_transfer_items_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer_items` ADD CONSTRAINT `inventory_transfer_items_transferId_fkey` FOREIGN KEY (`transferId`) REFERENCES `inventory_transfers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliation_variances` ADD CONSTRAINT `reconciliation_variances_reconciliation_run_id_fkey` FOREIGN KEY (`reconciliation_run_id`) REFERENCES `reconciliation_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
