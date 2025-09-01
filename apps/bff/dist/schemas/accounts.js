"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsListResponseSchema = exports.AccountResponseSchema = exports.ListAccountsQuerySchema = exports.UpdateAccountRequestSchema = exports.CreateAccountRequestSchema = exports.AccountSchema = exports.AccountTypeSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
exports.AccountTypeSchema = zod_1.z.enum([
    'asset',
    'liability',
    'equity',
    'income',
    'expense',
    'bank',
    'accounts_receivable',
    'accounts_payable',
    'other_current_asset',
    'fixed_asset',
    'other_asset',
    'other_current_liability',
    'long_term_liability',
    'cost_of_goods_sold',
    'other_income',
    'other_expense',
    'depreciation',
    'input_tax',
    'output_tax'
]);
exports.AccountSchema = zod_1.z.object({
    id: common_1.CuidSchema,
    organizationId: common_1.OrganizationIdSchema,
    code: zod_1.z.string().min(1).max(20),
    name: zod_1.z.string().min(1).max(255),
    type: exports.AccountTypeSchema,
    description: zod_1.z.string().max(1000).optional(),
    parentId: common_1.CuidSchema.optional(),
    currency: zod_1.z.string().length(3).default('MMK'),
    isActive: zod_1.z.boolean().default(true),
    debitBalance: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime()
});
exports.CreateAccountRequestSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(20),
    name: zod_1.z.string().min(1).max(255),
    type: exports.AccountTypeSchema,
    description: zod_1.z.string().max(1000).optional(),
    parentId: common_1.CuidSchema.optional(),
    currency: zod_1.z.string().length(3).default('MMK'),
    isActive: zod_1.z.boolean().default(true)
});
exports.UpdateAccountRequestSchema = exports.CreateAccountRequestSchema.partial();
exports.ListAccountsQuerySchema = common_1.PaginationSchema.extend({
    type: exports.AccountTypeSchema.optional(),
    search: zod_1.z.string().max(255).optional(),
    isActive: zod_1.z.coerce.boolean().optional(),
    sortBy: zod_1.z.enum(['code', 'name', 'type', 'createdAt']).default('code'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc')
});
exports.AccountResponseSchema = (0, common_1.SuccessResponseSchema)(exports.AccountSchema);
exports.AccountsListResponseSchema = (0, common_1.PaginatedResponseSchema)(exports.AccountSchema);
//# sourceMappingURL=accounts.js.map