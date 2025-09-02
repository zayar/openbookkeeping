'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
// Note: Using native select since @/components/ui/select is not properly implemented
import { useAuth } from '@/components/providers/auth-provider'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'

type Customer = {
  id: string
  name: string
  email: string
}

type Product = {
  id: string
  name: string
  description: string
  sellingPrice: string
  unit: string
  salesAccount: string
}

type Account = {
  id: string
  code: string
  name: string
  type: string
}

type Tax = {
  id: string
  name: string
  rate: number
  type: string
  isCompound: boolean
}

type InvoiceItem = {
  id: string
  productId?: string
  itemName: string
  description?: string
  quantity: number
  unit?: string
  rate: number
  discount?: number
  discountPercent?: number
  taxId?: string
  taxPercent?: number
  taxAmount?: number
  amount: number
  salesAccountId?: string
}

type Salesperson = {
  id: string
  name: string
  email: string | null
  status: 'active' | 'inactive'
}

type Branch = {
  id: string
  name: string
  isDefault: boolean
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  
  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceNumber: `INV-${Date.now()}`,
    orderNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms: 'Net 30',
    location: '',
    warehouse: '',
    salesperson: '',
    branchId: '',
    subject: '',
    customerNotes: '',
    termsConditions: '',
    discount: 0,
    discountPercent: 0,
    shippingCharges: 0,
    adjustment: 0,
  })

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: `item_${Date.now()}`,
      itemName: '',
      description: '',
      quantity: 1,
      unit: 'pcs',
      rate: 0,
      discount: 0,
      discountPercent: 0,
      taxId: '',
      taxPercent: 0,
      taxAmount: 0,
      amount: 0,
      salesAccountId: '',
    }
  ])

  useEffect(() => {
    if (!token) return

    const loadData = async () => {
      try {
        const [customersRes, accountsRes, productsRes, taxesRes, salespersonsRes, branchesRes] = await Promise.all([
          fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/accounts?type=income', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/items', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/taxes', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/salespersons', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/branches', { headers: { Authorization: `Bearer ${token}` } })
        ])

        const [customersData, accountsData, productsData, taxesData, salespersonsData, branchesData] = await Promise.all([
          customersRes.json(),
          accountsRes.json(),
          productsRes.json(),
          taxesRes.json(),
          salespersonsRes.json(),
          branchesRes.json()
        ])

        if (customersData.success) setCustomers(customersData.data)
        if (accountsData.success) {
          setAccounts(accountsData.data)
        }
        if (productsData.success) setProducts(productsData.data)
        if (taxesData.success) setTaxes(taxesData.data)
        if (salespersonsData.success) setSalespersons(salespersonsData.data)
        if (branchesData.success) setBranches(branchesData.data)
        
        // Auto-select default branch
        if (branchesData.success && branchesData.data.length > 0) {
          const defaultBranch = branchesData.data.find((branch: Branch) => branch.isDefault)
          if (defaultBranch) {
            setFormData(prev => ({ ...prev, branchId: defaultBranch.id }))
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }

    loadData()
  }, [token])

  // Update initial item with default sales account when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0 && items.length === 1 && !items[0].salesAccountId) {
      const salesAccount = accounts.find(acc => 
        acc.code === '4000' || 
        acc.name.toLowerCase().includes('sales revenue') ||
        acc.type === 'income' ||
        acc.type === 'revenue'
      )
      
      if (salesAccount) {
        setItems([{
          ...items[0],
          salesAccountId: salesAccount.id
        }])
      }
    }
  }, [accounts, items])

  // Get default sales account (4000 - Sales Revenue)
  const getDefaultSalesAccount = () => {
    const salesAccount = accounts.find(acc => 
      acc.code === '4000' || 
      acc.name.toLowerCase().includes('sales revenue') ||
      acc.type === 'income' ||
      acc.type === 'revenue'
    )
    return salesAccount?.id || ''
  }

  const calculateTaxAmount = (subtotal: number, taxId: string) => {
    const tax = taxes.find(t => t.id === taxId)
    if (!tax) return 0
    return (subtotal * tax.rate) / 100
  }

  const addItem = () => {
    setItems([...items, {
      id: `item_${Date.now()}`,
      itemName: '',
      description: '',
      quantity: 1,
      unit: 'pcs',
      rate: 0,
      discount: 0,
      discountPercent: 0,
      taxId: '',
      taxPercent: 0,
      taxAmount: 0,
      amount: 0,
      salesAccountId: getDefaultSalesAccount(),
    }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        
        // Recalculate amount when quantity or rate changes
        if (field === 'quantity' || field === 'rate' || field === 'discount') {
          const quantity = field === 'quantity' ? parseFloat(value) || 0 : updatedItem.quantity
          const rate = field === 'rate' ? parseFloat(value) || 0 : updatedItem.rate
          const discount = field === 'discount' ? parseFloat(value) || 0 : updatedItem.discount
          updatedItem.amount = (quantity * rate) - discount
        }
        
        return updatedItem
      }
      return item
    }))
  }

  // Handle product selection
  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setItems(items.map(item => {
        if (item.id === itemId) {
          const rate = parseFloat(product.sellingPrice) || 0
          const quantity = item.quantity || 1
          const discount = item.discount || 0
          const subtotal = quantity * rate
          const amount = subtotal - discount // Calculate amount
          
          return { 
            ...item, 
            productId: product.id,
            itemName: product.name,
            description: product.description || '',
            rate: rate,
            unit: product.unit || 'pcs',
            salesAccountId: product.salesAccount || getDefaultSalesAccount(),
            amount: amount // Set calculated amount
          }
        }
        return item
      }))
    }
  }

  const handleTaxChange = (itemId: string, taxId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const subtotal = (item.quantity * item.rate) - (item.discount || 0)
        const taxAmount = calculateTaxAmount(subtotal, taxId)
        const tax = taxes.find(t => t.id === taxId)
        
        return {
          ...item,
          taxId,
          taxPercent: tax ? tax.rate : 0,
          taxAmount,
          amount: subtotal + taxAmount
        }
      }
      return item
    }))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = (item.quantity * item.rate) - (item.discount || 0)
      return sum + itemSubtotal
    }, 0)
    
    const totalTax = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
    const discount = formData.discount || 0
    const shipping = formData.shippingCharges || 0
    const adjustment = formData.adjustment || 0
    const total = subtotal + totalTax - discount + shipping + adjustment
    
    return { subtotal, totalTax, discount, shipping, adjustment, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !formData.customerId || loading) return

    setLoading(true)
    try {
      // Generate idempotency key for safe invoice creation
      const idempotencyKey = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const requestData = {
        ...formData,
        salespersonId: formData.salesperson || null, // Map to the correct field name
        branchId: formData.branchId || null, // Add branch ID
        items: items.filter(item => item.itemName.trim() !== '').map(item => ({
          ...item,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          discount: Number(item.discount) || 0,
          discountPercent: Number(item.discountPercent) || 0,
          taxAmount: Number(item.taxAmount) || 0,
          taxPercent: Number(item.taxPercent) || 0,
          amount: Number(item.amount) || 0
        }))
      }
      
      console.log('Submitting invoice data:', requestData)
      
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()
      console.log('Invoice creation response:', data)
      
      if (response.ok && data.success) {
        router.push(`/invoices/${data.data.id}`)
      } else {
        const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('Invoice creation failed:', data)
        alert(`Failed to create invoice: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Network error: Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, discount, shipping, adjustment, total } = calculateTotals()

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <p>Please log in to create invoices.</p>
        <Link href="/login">
          <Button className="mt-4">Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
          <p className="text-gray-600">Create a new invoice for your customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Basic information about the invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Customer *</Label>
                <select
                  id="customer"
                  value={formData.customerId}
                  onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="terms">Payment Terms</Label>
                <select
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({...formData, terms: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                </select>
              </div>

              <div>
                <Label htmlFor="salesperson">Salesperson</Label>
                <div className="relative">
                  <select
                    id="salesperson"
                    value={formData.salesperson}
                    onChange={(e) => setFormData({...formData, salesperson: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select or add a salesperson</option>
                    {salespersons.filter(sp => sp.status === 'active').map((salesperson) => (
                      <option key={salesperson.id} value={salesperson.id}>
                        {salesperson.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Link 
                      href="/salespersons" 
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Manage Salespersons
                    </Link>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="branch">Branch</Label>
                <div className="relative">
                  <select
                    id="branch"
                    value={formData.branchId}
                    onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} {branch.isDefault && '(Default)'}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Link 
                      href="/branches" 
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Manage Branches
                    </Link>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({...formData, orderNumber: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Brief description of the invoice"
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>Add products or services to this invoice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <Label>Select Product/Item *</Label>
                      <div className="space-y-2">
                        {item.productId && (
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            ✓ Product selected from inventory
                          </div>
                        )}
                        <select
                          value={item.productId || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              selectProduct(item.id, e.target.value)
                            } else {
                              updateItem(item.id, 'productId', '')
                              updateItem(item.id, 'itemName', '')
                            }
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select an item or enter custom...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {product.sellingPrice} MMK/{product.unit || 'pcs'}
                            </option>
                          ))}
                        </select>
                        {/* Custom item input when no product selected */}
                        {!item.productId && (
                          <Input
                            value={item.itemName}
                            onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                            placeholder="Or type custom item name..."
                            className="mt-2"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label>Rate *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label>Unit</Label>
                      <Input
                        value={item.unit || ''}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        placeholder="pcs, hours, etc."
                      />
                    </div>

                    <div>
                      <Label>Discount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount || 0}
                        onChange={(e) => updateItem(item.id, 'discount', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Tax</Label>
                      <select
                        value={item.taxId || ''}
                        onChange={(e) => handleTaxChange(item.id, e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">No Tax</option>
                        {taxes.map((tax) => (
                          <option key={tax.id} value={tax.id}>
                            {tax.name} [{tax.rate}%]
                          </option>
                        ))}
                      </select>
                      {item.taxId && (
                        <div className="mt-1 text-xs text-gray-500">
                          Tax Amount: {item.taxAmount?.toFixed(2) || '0.00'} MMK
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Sales Account</Label>
                      <select
                        value={item.salesAccountId || ''}
                        onChange={(e) => updateItem(item.id, 'salesAccountId', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        value={item.amount.toFixed(2)}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>Description</Label>
                    <Textarea
                      value={item.description || ''}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Optional description"
                      rows={2}
                    />
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Totals and Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerNotes">Customer Notes</Label>
                <Textarea
                  id="customerNotes"
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                  placeholder="Notes for the customer"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="termsConditions">Terms & Conditions</Label>
                <Textarea
                  id="termsConditions"
                  value={formData.termsConditions}
                  onChange={(e) => setFormData({...formData, termsConditions: e.target.value})}
                  placeholder="Terms and conditions"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{subtotal.toFixed(2)} MMK</span>
                </div>
                
                {calculateTotals().totalTax > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Total Tax:</span>
                    <span>{calculateTotals().totalTax.toFixed(2)} MMK</span>
                  </div>
                )}
                
                {discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{discount.toFixed(2)} MMK</span>
                  </div>
                )}
                
                {shipping > 0 && (
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>{shipping.toFixed(2)} MMK</span>
                  </div>
                )}
                
                {adjustment !== 0 && (
                  <div className="flex justify-between">
                    <span>Adjustment:</span>
                    <span>{adjustment.toFixed(2)} MMK</span>
                  </div>
                )}
                
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{total.toFixed(2)} MMK</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <Label htmlFor="discount">Discount Amount</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="shippingCharges">Shipping Charges</Label>
                  <Input
                    id="shippingCharges"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.shippingCharges}
                    onChange={(e) => setFormData({...formData, shippingCharges: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="adjustment">Adjustment</Label>
                  <Input
                    id="adjustment"
                    type="number"
                    step="0.01"
                    value={formData.adjustment}
                    onChange={(e) => setFormData({...formData, adjustment: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link href="/invoices">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading || !formData.customerId}>
            {loading ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
