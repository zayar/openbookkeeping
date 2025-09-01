"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jwtAuth_1 = require("../middleware/jwtAuth");
const database_cloud_sql_only_1 = require("../services/database.cloud-sql-only");
const router = express_1.default.Router();
router.get('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const bankAccounts = await database_cloud_sql_only_1.prisma.bank_accounts.findMany({
            where: { organizationId: req.auth.organizationId },
            include: { ledgerAccount: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: bankAccounts });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch bank accounts' });
    }
});
router.post('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { bankName, accountName, accountNumber, routingNumber, accountType, currentBalance, currency, description, isPrimary, branch, swiftCode, iban } = req.body;
        const result = await database_cloud_sql_only_1.prisma.$transaction(async (tx) => {
            const existingAccounts = await tx.ledger_accounts.findMany({
                where: { organizationId: req.auth.organizationId }
            });
            let nextCode = 1000;
            const bankAccountCodes = existingAccounts
                .filter(acc => acc.type === 'bank' && /^\d{4}$/.test(acc.code))
                .map(acc => parseInt(acc.code))
                .sort((a, b) => a - b);
            if (bankAccountCodes.length > 0) {
                nextCode = Math.max(...bankAccountCodes) + 1;
            }
            const ledgerAccount = await tx.ledger_accounts.create({
                data: {
                    organizationId: req.auth.organizationId,
                    code: nextCode.toString().padStart(4, '0'),
                    name: `${bankName} - ${accountName}`,
                    type: 'bank',
                    description: description || `Bank account: ${accountName} at ${bankName}`,
                    isActive: true
                }
            });
            const bankAccount = await tx.bankAccount.create({
                data: {
                    organizationId: req.auth.organizationId,
                    bankName,
                    accountName,
                    accountNumber,
                    routingNumber,
                    accountType,
                    currency: currency || 'MMK',
                    description,
                    isPrimary: isPrimary || false,
                    branch,
                    swiftCode,
                    iban,
                    currentBalance: currentBalance || 0,
                    ledgerAccountId: ledgerAccount.id
                }
            });
            if (isPrimary) {
                await tx.bankAccount.updateMany({
                    where: {
                        organizationId: req.auth.organizationId,
                        id: { not: bankAccount.id }
                    },
                    data: { isPrimary: false }
                });
            }
            return { bankAccount, ledgerAccount };
        });
        const bankAccountWithLedger = await database_cloud_sql_only_1.prisma.bank_accounts.findFirst({
            where: { id: result.bankAccount.id },
            include: { ledgerAccount: true }
        });
        res.json({
            success: true,
            data: bankAccountWithLedger,
            message: 'Bank account created successfully and added to Chart of Accounts'
        });
    }
    catch (error) {
        console.error('Error creating bank account:', error);
        const msg = error?.code === 'P2002' ? 'Account number already exists' : 'Failed to create bank account';
        res.status(400).json({ success: false, error: msg });
    }
});
router.get('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const bankAccount = await database_cloud_sql_only_1.prisma.bank_accounts.findFirst({
            where: { id: req.params.id, organizationId: req.auth.organizationId },
            include: { ledgerAccount: true }
        });
        if (!bankAccount)
            return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: bankAccount });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch bank account' });
    }
});
router.put('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { bankName, accountName, accountNumber, routingNumber, accountType, currentBalance, isActive, currency, description, isPrimary, branch, swiftCode, iban } = req.body;
        const result = await database_cloud_sql_only_1.prisma.$transaction(async (tx) => {
            const existingBankAccount = await tx.bankAccount.findFirst({
                where: { id: req.params.id, organizationId: req.auth.organizationId },
                include: { ledgerAccount: true }
            });
            if (!existingBankAccount) {
                throw new Error('Bank account not found');
            }
            const updatedBankAccount = await tx.bankAccount.update({
                where: { id: req.params.id },
                data: {
                    bankName,
                    accountName,
                    accountNumber,
                    routingNumber,
                    accountType,
                    currentBalance,
                    isActive,
                    currency,
                    description,
                    isPrimary,
                    branch,
                    swiftCode,
                    iban
                }
            });
            if (existingBankAccount.ledgerAccountId) {
                await tx.ledger_accounts.update({
                    where: { id: existingBankAccount.ledgerAccountId },
                    data: {
                        name: `${bankName} - ${accountName}`,
                        description: description || `Bank account: ${accountName} at ${bankName}`
                    }
                });
            }
            if (isPrimary) {
                await tx.bankAccount.updateMany({
                    where: {
                        organizationId: req.auth.organizationId,
                        id: { not: req.params.id }
                    },
                    data: { isPrimary: false }
                });
            }
            return updatedBankAccount;
        });
        const updatedWithLedger = await database_cloud_sql_only_1.prisma.bank_accounts.findFirst({
            where: { id: req.params.id },
            include: { ledgerAccount: true }
        });
        res.json({
            success: true,
            data: updatedWithLedger,
            message: 'Bank account updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating bank account:', error);
        res.status(500).json({ success: false, error: 'Failed to update bank account' });
    }
});
router.delete('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const existing = await database_cloud_sql_only_1.prisma.bank_accounts.findFirst({ where: { id: req.params.id, organizationId: req.auth.organizationId } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Not found' });
        await database_cloud_sql_only_1.prisma.bank_accounts.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete bank account' });
    }
});
exports.default = router;
//# sourceMappingURL=bankAccounts.js.map