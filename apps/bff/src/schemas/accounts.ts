import { z } from 'zod'
import { CuidSchema, OrganizationIdSchema, PaginationSchema, SuccessResponseSchema, PaginatedResponseSchema } from './common'

// =============================================
// ACCOUNT VALIDATION SCHEMAS (OA ALIGNED)
// =============================================

// Account type enum (aligned with OA API)
export const AccountTypeSchema = z.enum([
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
])

// Base account schema (aligned with OA Account resource)
export const AccountSchema = z.object({
  id: CuidSchema,
  organizationId: OrganizationIdSchema,
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  type: AccountTypeSchema,
  description: z.string().max(1000).optional(),
  parentId: CuidSchema.optional(),
  currency: z.string().length(3).default('MMK'),
  isActive: z.boolean().default(true),
  debitBalance: z.boolean().default(true),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Create account request schema
export const CreateAccountRequestSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  type: AccountTypeSchema,
  description: z.string().max(1000).optional(),
  parentId: CuidSchema.optional(),
  currency: z.string().length(3).default('MMK'),
  isActive: z.boolean().default(true)
})

// Update account request schema
export const UpdateAccountRequestSchema = CreateAccountRequestSchema.partial()

// List accounts query schema
export const ListAccountsQuerySchema = PaginationSchema.extend({
  type: AccountTypeSchema.optional(),
  search: z.string().max(255).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['code', 'name', 'type', 'createdAt']).default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Response schemas
export const AccountResponseSchema = SuccessResponseSchema(AccountSchema)
export const AccountsListResponseSchema = PaginatedResponseSchema(AccountSchema)

// Export types
export type Account = z.infer<typeof AccountSchema>
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>
export type ListAccountsQuery = z.infer<typeof ListAccountsQuerySchema>
export type AccountResponse = z.infer<typeof AccountResponseSchema>
export type AccountsListResponse = z.infer<typeof AccountsListResponseSchema>
