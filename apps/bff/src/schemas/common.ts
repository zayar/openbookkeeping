import { z } from 'zod'

// =============================================
// COMMON VALIDATION SCHEMAS
// =============================================

// Pagination schema
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional()
})

// Common ID schemas
export const CuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format')
export const OrganizationIdSchema = CuidSchema
export const UserIdSchema = CuidSchema

// Currency schema (ISO 4217)
export const CurrencySchema = z.string().length(3).regex(/^[A-Z]{3}$/)

// Date schemas
export const DateStringSchema = z.string().datetime()
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// Error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
  requestId: z.string().optional()
})

// Success response schema
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }).optional(),
    timestamp: z.string().datetime().default(() => new Date().toISOString()),
    requestId: z.string().optional()
  })

// Paginated response schema
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }),
    timestamp: z.string().datetime().default(() => new Date().toISOString()),
    requestId: z.string().optional()
  })

// Request context schema (for tenant isolation)
export const RequestContextSchema = z.object({
  userId: UserIdSchema,
  organizationId: OrganizationIdSchema,
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  requestId: z.string(),
  timestamp: z.string().datetime()
})

export type PaginationInput = z.infer<typeof PaginationSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type RequestContext = z.infer<typeof RequestContextSchema>
