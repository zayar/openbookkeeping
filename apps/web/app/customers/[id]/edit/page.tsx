'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CUSTOMER_TYPES = ['business', 'individual']
const PRIORITIES = ['low', 'normal', 'high']
const SALUTATIONS = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sir', 'Madam']
const CURRENCIES = [
  { code: 'MMK', name: 'MMK - Myanmar Kyat' },
  { code: 'USD', name: 'USD - US Dollar' },
  { code: 'SGD', name: 'SGD - Singapore Dollar' },
  { code: 'EUR', name: 'EUR - Euro' },
  { code: 'GBP', name: 'GBP - British Pound' }
]
const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60']
const PORTAL_LANGUAGES = ['English', 'Myanmar', 'Chinese', 'Thai']

type Customer = {
  id: string
  name: string
  displayName?: string
  email?: string
  phone?: string
  mobile?: string
  customerType: 'business' | 'individual'
  salutation?: string
  firstName?: string
  lastName?: string
  companyName?: string
  billingAddress?: any
  shippingAddress?: any
  industry?: string
  source?: string
  priority: 'low' | 'normal' | 'high'
  companyId?: string
  currency: string
  taxRate?: string
  paymentTerms?: string
  openingBalance?: number
  openingBalanceAccount?: string
  enablePortal: boolean
  portalLanguage?: string
  tags?: any
  notes?: string
  remarks?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastContactAt?: string
}

export default function EditCustomerPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState({ 
    name: '', displayName: '', email: '', phone: '', mobile: '', 
    customerType: 'business' as 'business' | 'individual', salutation: '', firstName: '', lastName: '', companyName: '',
    billingAddress: { attention: '', country: '', street1: '', street2: '', city: '', state: '', zipCode: '', phone: '', fax: '' },
    shippingAddress: { attention: '', country: '', street1: '', street2: '', city: '', state: '', zipCode: '', phone: '', fax: '' },
    industry: '', source: '', priority: 'normal' as 'low' | 'normal' | 'high', companyId: '', currency: 'MMK', 
    taxRate: '', paymentTerms: 'Due on Receipt', openingBalance: '', openingBalanceAccount: '',
    enablePortal: false, portalLanguage: 'English', notes: '', remarks: '', isActive: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Check authentication status on component mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
    setIsAuthenticated(!!token)
    
    if (!token) {
      setError('You must be logged in to edit customers. Please log in first.')
    }
  }, [])

  // Load customer data
  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
        
        if (!token) {
          setError('You must be logged in to edit customers.')
          setLoading(false)
          return
        }
        
        const res = await fetch(`/api/customers/${params.id}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        })
        
        if (res.status === 401) {
          setError('Your session has expired. Please log in again.')
          localStorage.removeItem('auth_token')
          setLoading(false)
          return
        }
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        
        const data = await res.json()
        if (data.success) {
          const customerData = data.data
          setCustomer(customerData)
          setForm({
            name: customerData.name || '',
            displayName: customerData.displayName || '',
            email: customerData.email || '',
            phone: customerData.phone || '',
            mobile: customerData.mobile || '',
            customerType: customerData.customerType || 'business',
            salutation: customerData.salutation || '',
            firstName: customerData.firstName || '',
            lastName: customerData.lastName || '',
            companyName: customerData.companyName || '',
            billingAddress: customerData.billingAddress || { attention: '', country: '', street1: '', street2: '', city: '', state: '', zipCode: '', phone: '', fax: '' },
            shippingAddress: customerData.shippingAddress || { attention: '', country: '', street1: '', street2: '', city: '', state: '', zipCode: '', phone: '', fax: '' },
            industry: customerData.industry || '',
            source: customerData.source || '',
            priority: customerData.priority || 'normal',
            companyId: customerData.companyId || '',
            currency: customerData.currency || 'MMK',
            taxRate: customerData.taxRate || '',
            paymentTerms: customerData.paymentTerms || 'Due on Receipt',
            openingBalance: customerData.openingBalance ? customerData.openingBalance.toString() : '',
            openingBalanceAccount: customerData.openingBalanceAccount || '',
            enablePortal: customerData.enablePortal || false,
            portalLanguage: customerData.portalLanguage || 'English',
            notes: customerData.notes || '',
            remarks: customerData.remarks || '',
            isActive: customerData.isActive !== undefined ? customerData.isActive : true
          })
        } else {
          setError(data.error || 'Failed to load customer')
        }
      } catch (error: any) {
        setError(error.message || 'Failed to load customer')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadCustomer()
    }
  }, [params.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      
      // Check if user is authenticated
      if (!token) {
        setError('You must be logged in to edit customers. Please log in first.')
        setSaving(false)
        return
      }
      
      console.log('Updating customer:', { token: token ? 'present' : 'missing', form })
      
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : null
        })
      })
      
      console.log('Response status:', res.status, res.statusText)
      
      if (res.status === 401) {
        setError('Your session has expired. Please log in again.')
        setSaving(false)
        localStorage.removeItem('auth_token')
        return
      }
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Error response:', errorText)
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }
      
      const data = await res.json()
      console.log('Response data:', data)
      
      if (data.success) {
        router.push(`/customers/${params.id}`)
      } else {
        setError(data.error || 'Failed to update customer')
      }
    } catch (e: any) { 
      console.error('Submit error:', e)
      setError(e.message || 'Failed to update customer') 
    } finally { 
      setSaving(false) 
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading customer details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Customer</h2>
          <p className="text-gray-600 mb-6">{error || 'Customer not found'}</p>
          <Button onClick={() => router.back()}>
            ← Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
          <p className="text-gray-600 mt-2">Update customer information</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-md text-sm bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {/* Customer Type Selection */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Customer Type
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {CUSTOMER_TYPES.map(type => (
                <div
                  key={type}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    form.customerType === type 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setForm({...form, customerType: type as 'business' | 'individual'})}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      type === 'business' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {type === 'business' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">{type}</div>
                      <div className="text-xs text-gray-500">
                        {type === 'business' ? 'Company or organization' : 'Individual person'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Primary Contact Information */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Primary Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salutation">Salutation</Label>
                <select
                  id="salutation"
                  value={form.salutation}
                  onChange={(e) => setForm({...form, salutation: e.target.value})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Salutation</option>
                  {SALUTATIONS.map(sal => (
                    <option key={sal} value={sal}>{sal}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({...form, firstName: e.target.value})}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({...form, lastName: e.target.value})}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => setForm({...form, companyName: e.target.value})}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm({...form, displayName: e.target.value})}
                  placeholder="Select or type to add"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={form.mobile}
                  onChange={(e) => setForm({...form, mobile: e.target.value})}
                  placeholder="Enter mobile number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={form.industry}
                  onChange={(e) => setForm({...form, industry: e.target.value})}
                  placeholder="Enter industry"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={form.source}
                  onChange={(e) => setForm({...form, source: e.target.value})}
                  placeholder="How they found us"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={(e) => setForm({...form, priority: e.target.value as 'low' | 'normal' | 'high'})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Company ID</Label>
                <Input
                  id="companyId"
                  value={form.companyId}
                  onChange={(e) => setForm({...form, companyId: e.target.value})}
                  placeholder="Company registration ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({...form, isActive: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="isActive" className="text-sm font-medium">
                    {form.isActive ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Financial Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setForm({...form, currency: e.target.value})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency.code} value={currency.code}>{currency.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate</Label>
                <Input
                  id="taxRate"
                  value={form.taxRate}
                  onChange={(e) => setForm({...form, taxRate: e.target.value})}
                  placeholder="Select a Tax"
                />
                <p className="text-xs text-gray-500">To associate more than one tax, you need to create a tax group in Settings.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <select
                  id="paymentTerms"
                  value={form.paymentTerms}
                  onChange={(e) => setForm({...form, paymentTerms: e.target.value})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAYMENT_TERMS.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openingBalance">Opening Balance</Label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.openingBalanceAccount}
                    onChange={(e) => setForm({...form, openingBalanceAccount: e.target.value})}
                    className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Head Office</option>
                  </select>
                  <Input
                    id="openingBalance"
                    type="number"
                    step="0.01"
                    value={form.openingBalance}
                    onChange={(e) => setForm({...form, openingBalance: e.target.value})}
                    placeholder="MMK"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portal Settings */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Portal Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enablePortal"
                  checked={form.enablePortal}
                  onChange={(e) => setForm({...form, enablePortal: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="enablePortal" className="text-lg font-medium">Enable Portal?</Label>
              </div>
              <p className="text-sm text-gray-600">Allow portal access for this customer</p>
              
              {form.enablePortal && (
                <div className="space-y-2">
                  <Label htmlFor="portalLanguage">Portal Language</Label>
                  <select
                    id="portalLanguage"
                    value={form.portalLanguage}
                    onChange={(e) => setForm({...form, portalLanguage: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PORTAL_LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  placeholder="Enter general notes about the customer"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 h-20 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <textarea
                  id="remarks"
                  value={form.remarks}
                  onChange={(e) => setForm({...form, remarks: e.target.value})}
                  placeholder="Enter additional remarks"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 h-20 resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !isAuthenticated} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Updating...' : !isAuthenticated ? 'Please Log In First' : 'Update Customer'}
          </Button>
        </div>
      </form>
    </div>
  )
}
