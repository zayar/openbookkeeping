import { z } from 'zod'

export const CustomerSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  oaCustomerId: z.string().nullable().optional(),
  name: z.string(),
  displayName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  customerType: z.string().optional(),
  salutation: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  billingAddress: z.any().nullable().optional(),
  shippingAddress: z.any().nullable().optional(),
  industry: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  priority: z.string().optional(),
  companyId: z.string().nullable().optional(),
  currency: z.string().optional(),
  taxRate: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  openingBalance: z.number().nullable().optional(),
  openingBalanceAccount: z.string().nullable().optional(),
  enablePortal: z.boolean().optional(),
  portalLanguage: z.string().nullable().optional(),
  tags: z.any().nullable().optional(),
  notes: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastContactAt: z.string().datetime().nullable().optional()
})

export const CustomersListResponse = z.object({
  success: z.literal(true),
  data: z.array(CustomerSchema)
})

export const CustomerResponse = z.object({
  success: z.literal(true),
  data: CustomerSchema
})

export type Customer = z.infer<typeof CustomerSchema>

