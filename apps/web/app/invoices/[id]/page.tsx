'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { ArrowLeft, Edit, DollarSign, FileText, CheckCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

type Invoice = {
  id: string
  invoiceNumber: string
  customerId: string
  issueDate: string
  dueDate: string
  status: string
  totalAmount: string
  balanceDue: string
  paidAmount: string
  customers: {
    id: string
    name: string
    email: string
  }
  invoice_items: Array<{
    id: string
    itemName: string
    description: string
    quantity: string
    rate: string
    amount: string
    unit: string
  }>
  invoice_payments: Array<{
    id: string
    paymentNumber: string
    paymentDate: string
    amountReceived: string
    paymentMode: string
    reference: string
  }>
  journals?: {
    id: string
    journalNumber: string
    journalDate: string
    notes: string
    totalDebit: string
    totalCredit: string
    journal_entries: Array<{
      id: string
      accountId: string
      description: string
      debitAmount: string
      creditAmount: string
      ledger_accounts: {
        id: string
        code: string
        name: string
        type: string
      }
    }>
  }
}

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const { token, user } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!token || !params.id) return

    const loadInvoice = async () => {
      try {
        const res = await fetch(`/api/invoices/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
          setInvoice(data.data)
        }
      } catch (error) {
        console.error('Failed to load invoice:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [token, params.id])

  const confirmInvoice = async () => {
    if (!invoice) return
    
    setConfirming(true)
    try {
      // Generate idempotency key for safe invoice confirmation
      const idempotencyKey = `confirm_${invoice.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const res = await fetch(`/api/invoices/${invoice.id}/confirm`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        }
      })
      const data = await res.json()
      if (data.success) {
        setInvoice(data.data)
        alert('Invoice confirmed! Journal entries have been created.')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to confirm invoice:', error)
      alert('Failed to confirm invoice')
    } finally {
      setConfirming(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount) || 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <p>Please log in to view invoices.</p>
        <Link href="/login">
          <Button className="mt-4">Login</Button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center py-8">Loading invoice...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Invoice not found</p>
          <Link href="/invoices">
            <Button>Back to Invoices</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-gray-600">Customer: {invoice.customers.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status.toUpperCase()}
          </Badge>
          
          {invoice.status === 'draft' && (
            <div className="flex gap-2">
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button onClick={confirmInvoice} disabled={confirming}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {confirming ? 'Confirming...' : 'Confirm Invoice'}
              </Button>
            </div>
          )}
          
          {(invoice.status === 'confirmed' || invoice.status === 'overdue') && parseFloat(invoice.balanceDue) > 0 && (
            <Link href={`/invoices/${invoice.id}/payment`}>
              <Button>
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Issue Date</Label>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Due Date</Label>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer</Label>
                  <p className="font-medium">{invoice.customers.name}</p>
                  <p className="text-sm text-gray-500">{invoice.customers.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Item</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Rate</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.invoice_items || []).map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3">
                          <div className="font-medium">{item.itemName}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500">{item.description}</div>
                          )}
                        </td>
                        <td className="text-right py-3">
                          {parseFloat(item.quantity).toFixed(2)} {item.unit}
                        </td>
                        <td className="text-right py-3">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="text-right py-3 font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          {invoice.invoice_payments && invoice.invoice_payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(invoice.invoice_payments || []).map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">{payment.paymentNumber}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(payment.paymentDate)} • {payment.paymentMode}
                          {payment.reference && ` • ${payment.reference}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {formatCurrency(payment.amountReceived)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Amount Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold">
                <span>Balance Due:</span>
                <span className={parseFloat(invoice.balanceDue) > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(invoice.balanceDue)}
                </span>
              </div>
            </CardContent>
          </Card>

          {invoice.journals && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      Journal Entry
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Journal #{invoice.journals.journalNumber} • {formatDate(invoice.journals.journalDate)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    <FileText className="h-3 w-3 mr-1" />
                    Created
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {/* Journal Entries - Card Layout */}
                  {(invoice.journals.journal_entries || []).map((entry, index) => {
                    const isDebit = parseFloat(entry.debitAmount) > 0
                    const amount = isDebit ? entry.debitAmount : entry.creditAmount
                    
                    return (
                      <div key={entry.id} className={`p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <div className="flex items-center justify-between">
                          {/* Account Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-semibold text-gray-900">
                                {entry.ledger_accounts?.code} - {entry.ledger_accounts?.name}
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${isDebit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {isDebit ? 'Debit' : 'Credit'}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mb-1">
                              {entry.description}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {entry.ledger_accounts?.type?.replace(/_/g, ' ')} Account
                            </div>
                          </div>
                          
                          {/* Amount */}
                          <div className="text-right ml-4">
                            <div className={`text-lg font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                              {isDebit ? '-' : '+'}{formatCurrency(amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {isDebit ? 'Debit Amount' : 'Credit Amount'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Totals Summary */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 border-t-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900">Journal Totals</h4>
                        <p className="text-sm text-gray-600">Debits must equal credits</p>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Total Debits</div>
                          <div className="font-bold text-red-600">
                            {formatCurrency(invoice.journals.totalDebit)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Total Credits</div>
                          <div className="font-bold text-green-600">
                            {formatCurrency(invoice.journals.totalCredit)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Balance Check */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        {parseFloat(invoice.journals.totalDebit) === parseFloat(invoice.journals.totalCredit) ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-700">Journal is balanced</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium text-red-700">Journal is unbalanced</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {invoice.journals.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600 italic">
                          <strong>Notes:</strong> {invoice.journals.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}


