"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContextSchema = exports.PaginatedResponseSchema = exports.SuccessResponseSchema = exports.ErrorResponseSchema = exports.DateRangeSchema = exports.DateStringSchema = exports.CurrencySchema = exports.UserIdSchema = exports.OrganizationIdSchema = exports.CuidSchema = exports.PaginationSchema = void 0;
const zod_1 = require("zod");
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).optional(),
    cursor: zod_1.z.string().optional()
});
exports.CuidSchema = zod_1.z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format');
exports.OrganizationIdSchema = exports.CuidSchema;
exports.UserIdSchema = exports.CuidSchema;
exports.CurrencySchema = zod_1.z.string().length(3).regex(/^[A-Z]{3}$/);
exports.DateStringSchema = zod_1.z.string().datetime();
exports.DateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional()
});
exports.ErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: zod_1.z.string(),
    code: zod_1.z.string().optional(),
    details: zod_1.z.any().optional(),
    timestamp: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    requestId: zod_1.z.string().optional()
});
const SuccessResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.literal(true),
    data: dataSchema,
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
        hasNext: zod_1.z.boolean(),
        hasPrev: zod_1.z.boolean()
    }).optional(),
    timestamp: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    requestId: zod_1.z.string().optional()
});
exports.SuccessResponseSchema = SuccessResponseSchema;
const PaginatedResponseSchema = (itemSchema) => zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(itemSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
        hasNext: zod_1.z.boolean(),
        hasPrev: zod_1.z.boolean()
    }),
    timestamp: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    requestId: zod_1.z.string().optional()
});
exports.PaginatedResponseSchema = PaginatedResponseSchema;
exports.RequestContextSchema = zod_1.z.object({
    userId: exports.UserIdSchema,
    organizationId: exports.OrganizationIdSchema,
    role: zod_1.z.enum(['owner', 'admin', 'member', 'viewer']),
    requestId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime()
});
//# sourceMappingURL=common.js.map