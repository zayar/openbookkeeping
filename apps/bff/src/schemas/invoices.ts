import { z } from 'zod'

export const InvoiceItemInput = z.object({
  productId: z.string().optional().nullable(),
  itemName: z.string(),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit: z.string().optional().nullable(),
  rate: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().default(0),
  discountPercent: z.number().nonnegative().optional().default(0),
  taxId: z.string().optional().nullable(),
  taxPercent: z.number().nonnegative().optional().default(0),
  taxAmount: z.number().nonnegative().optional().default(0),
  salesAccountId: z.string().optional().nullable()
})

export const InvoiceCreateRequest = z.object({
  invoiceNumber: z.string().min(1),
  customerId: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  branchId: z.string().optional().nullable(),
  salespersonId: z.string().optional().nullable(),
  items: z.array(InvoiceItemInput).min(1),
  taxes: z.array(z.any()).optional().default([])
})

export const InvoiceResponse = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    invoiceNumber: z.string(),
    organizationId: z.string(),
    customerId: z.string(),
    status: z.string(),
    totalAmount: z.any(),
    balanceDue: z.any()
  }).passthrough()
})

export const InvoiceConfirmResponse = z.object({
  success: z.literal(true),
  data: z.object({
    invoice: z.object({ id: z.string(), status: z.string() }).passthrough(),
    journalId: z.string()
  })
})

export const PaymentCreateRequest = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  depositTo: z.string().min(1)
})

export const PaymentResponse = z.object({
  success: z.literal(true),
  data: z.object({
    payment: z.object({ id: z.string() }).passthrough(),
    invoice: z.object({ id: z.string(), status: z.string() }).passthrough(),
    journalId: z.string()
  })
})

export type InvoiceCreateRequestType = z.infer<typeof InvoiceCreateRequest>
export type PaymentCreateRequestType = z.infer<typeof PaymentCreateRequest>

