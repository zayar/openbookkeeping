-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `googleId` VARCHAR(191) NULL,
    `defaultCurrency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Yangon',
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_googleId_key`(`googleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `accounts_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_tokens` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verification_tokens_token_key`(`token`),
    UNIQUE INDEX `verification_tokens_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizations` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `oaOrganizationId` VARCHAR(191) NOT NULL,
    `baseCurrency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `fiscalYearStart` VARCHAR(191) NOT NULL DEFAULT '01-01',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Yangon',
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Myanmar',
    `postalCode` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `taxNumber` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `subscriptionStatus` VARCHAR(191) NOT NULL DEFAULT 'trial',
    `subscriptionPlan` VARCHAR(191) NOT NULL DEFAULT 'basic',
    `billingCycle` VARCHAR(191) NOT NULL DEFAULT 'monthly',
    `multiCurrency` BOOLEAN NOT NULL DEFAULT false,
    `advancedReporting` BOOLEAN NOT NULL DEFAULT false,
    `apiAccess` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_slug_key`(`slug`),
    UNIQUE INDEX `organizations_oaOrganizationId_key`(`oaOrganizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_members` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `permissions` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_members_organizationId_userId_key`(`organizationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `invitedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_invitations_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `keyHash` VARCHAR(191) NOT NULL,
    `scopes` JSON NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_keys_keyHash_key`(`keyHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_entries` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `tags` JSON NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cache_entries_key_key`(`key`),
    INDEX `cache_entries_key_idx`(`key`),
    INDEX `cache_entries_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `method` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,
    `oldValues` JSON NULL,
    `newValues` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    INDEX `audit_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `audit_logs_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_preferences` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `theme` VARCHAR(191) NOT NULL DEFAULT 'system',
    `sidebarCollapsed` BOOLEAN NOT NULL DEFAULT false,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `dashboardLayout` JSON NULL,
    `favoriteReports` JSON NULL,
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `pushNotifications` BOOLEAN NOT NULL DEFAULT true,
    `weeklyDigest` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_preferences_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_settings` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `accountNumbering` VARCHAR(191) NOT NULL DEFAULT 'auto',
    `decimalPrecision` INTEGER NOT NULL DEFAULT 2,
    `negativeAmountFormat` VARCHAR(191) NOT NULL DEFAULT 'parentheses',
    `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'INV',
    `invoiceNumbering` VARCHAR(191) NOT NULL DEFAULT 'auto',
    `defaultPaymentTerms` VARCHAR(191) NOT NULL DEFAULT 'Net 30',
    `defaultTaxRate` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `taxNumberRequired` BOOLEAN NOT NULL DEFAULT false,
    `requireApprovalForExpenses` BOOLEAN NOT NULL DEFAULT false,
    `requireApprovalForPurchases` BOOLEAN NOT NULL DEFAULT false,
    `webhookUrl` VARCHAR(191) NULL,
    `slackWebhook` VARCHAR(191) NULL,
    `customFields` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_settings_organizationId_key`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_status` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `nextSyncAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `errorMessage` VARCHAR(191) NULL,
    `recordsProcessed` INTEGER NOT NULL DEFAULT 0,
    `totalRecords` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sync_status_organizationId_resource_key`(`organizationId`, `resource`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `oaCustomerId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `customerType` VARCHAR(191) NOT NULL DEFAULT 'business',
    `salutation` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `billingAddress` JSON NULL,
    `shippingAddress` JSON NULL,
    `industry` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `companyId` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `taxRate` VARCHAR(191) NULL,
    `paymentTerms` VARCHAR(191) NULL,
    `openingBalance` DECIMAL(12, 2) NULL,
    `openingBalanceAccount` VARCHAR(191) NULL,
    `enablePortal` BOOLEAN NOT NULL DEFAULT false,
    `portalLanguage` VARCHAR(191) NULL DEFAULT 'English',
    `tags` JSON NULL,
    `notes` TEXT NULL,
    `remarks` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastContactAt` DATETIME(3) NULL,

    UNIQUE INDEX `customers_oaCustomerId_key`(`oaCustomerId`),
    INDEX `customers_organizationId_idx`(`organizationId`),
    INDEX `customers_oaCustomerId_idx`(`oaCustomerId`),
    INDEX `customers_customerType_idx`(`customerType`),
    INDEX `customers_currency_idx`(`currency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `oaItemId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'goods',
    `description` TEXT NULL,
    `unit` VARCHAR(191) NULL,
    `sellingPrice` DECIMAL(12, 2) NOT NULL,
    `costPrice` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `salesAccountId` VARCHAR(191) NULL,
    `purchaseAccountId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `brand` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `trackInventory` BOOLEAN NOT NULL DEFAULT false,
    `currentStock` DECIMAL(12, 2) NULL,
    `lowStockAlert` DECIMAL(12, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_oaItemId_key`(`oaItemId`),
    INDEX `products_organizationId_idx`(`organizationId`),
    INDEX `products_oaItemId_idx`(`oaItemId`),
    INDEX `products_type_idx`(`type`),
    INDEX `products_currency_idx`(`currency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ledger_accounts_organizationId_type_idx`(`organizationId`, `type`),
    UNIQUE INDEX `ledger_accounts_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `routingNumber` VARCHAR(191) NULL,
    `accountType` VARCHAR(191) NOT NULL DEFAULT 'checking',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `description` TEXT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `branch` VARCHAR(191) NULL,
    `swiftCode` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `ledgerAccountId` VARCHAR(191) NULL,
    `currentBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bank_accounts_ledgerAccountId_key`(`ledgerAccountId`),
    INDEX `bank_accounts_organizationId_idx`(`organizationId`),
    INDEX `bank_accounts_currency_idx`(`currency`),
    UNIQUE INDEX `bank_accounts_organizationId_accountNumber_key`(`organizationId`, `accountNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_invitations` ADD CONSTRAINT `organization_invitations_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_settings` ADD CONSTRAINT `organization_settings_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_salesAccountId_fkey` FOREIGN KEY (`salesAccountId`) REFERENCES `ledger_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_purchaseAccountId_fkey` FOREIGN KEY (`purchaseAccountId`) REFERENCES `ledger_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_ledgerAccountId_fkey` FOREIGN KEY (`ledgerAccountId`) REFERENCES `ledger_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
