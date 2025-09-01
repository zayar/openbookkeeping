'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/components/providers/auth-provider'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Invoice = {
  id: string
  invoiceNumber: string
  customerId: string
  totalAmount: string
  paidAmount: string
  balanceDue: string
  status: string
  customers: {
    name: string
    email: string
  }
}

type Account = {
  id: string
  code: string
  name: string
  type: string
}

export default function RecordPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { token } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    amountReceived: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'bank_transfer',
    depositTo: '',
    reference: '',
    notes: '',
    bankCharges: '0',
    taxDeducted: false,
    tdsAmount: '0'
  })

  useEffect(() => {
    if (!token || !params.id) return

    const loadData = async () => {
      try {
        // Load invoice
        const invoiceRes = await fetch(`/api/invoices/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const invoiceData = await invoiceRes.json()
        if (invoiceData.success) {
          setInvoice(invoiceData.data)
          // Set default amount to remaining balance
          setFormData(prev => ({
            ...prev,
            amountReceived: invoiceData.data.balanceDue
          }))
        }

        // Load bank/cash accounts for deposit
        const accountsRes = await fetch('/api/accounts', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const accountsData = await accountsRes.json()
        if (accountsData.success) {
          // Filter to only bank and cash accounts
          const depositAccounts = accountsData.data.filter((acc: Account) => 
            acc.type === 'bank' || acc.type === 'cash'
          )
          setAccounts(depositAccounts)
          
          // Set first bank account as default
          if (depositAccounts.length > 0) {
            setFormData(prev => ({
              ...prev,
              depositTo: depositAccounts[0].id
            }))
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoice) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (data.success) {
        alert('Payment recorded successfully!')
        router.push(`/invoices/${invoice.id}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to record payment:', error)
      alert('Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount) || 0)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Invoice not found</p>
          <Link href="/invoices">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/invoices/${invoice.id}`} className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoice
        </Link>
        <h1 className="text-2xl font-bold">Record Payment</h1>
        <p className="text-gray-600">Invoice {invoice.invoiceNumber} - {invoice.customers.name}</p>
      </div>

      {/* Invoice Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500">Total Amount</div>
              <div className="font-medium">{formatCurrency(invoice.totalAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Paid Amount</div>
              <div className="font-medium text-green-600">{formatCurrency(invoice.paidAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Balance Due</div>
              <div className="font-medium text-red-600">{formatCurrency(invoice.balanceDue)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Enter the payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="amountReceived">Amount Received *</Label>
                <Input
                  id="amountReceived"
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.balanceDue}
                  value={formData.amountReceived}
                  onChange={(e) => setFormData({...formData, amountReceived: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <select
                  id="paymentMode"
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div>
                <Label htmlFor="depositTo">Deposit To *</Label>
                <select
                  id="depositTo"
                  value={formData.depositTo}
                  onChange={(e) => setFormData({...formData, depositTo: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder="Transaction reference"
                />
              </div>

              <div>
                <Label htmlFor="bankCharges">Bank Charges</Label>
                <Input
                  id="bankCharges"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.bankCharges}
                  onChange={(e) => setFormData({...formData, bankCharges: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about the payment"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/invoices/${invoice.id}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
