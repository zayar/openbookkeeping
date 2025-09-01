'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  DollarSign,
  Globe,
  Calendar,
  Tag
} from 'lucide-react'

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

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
        
        if (!token) {
          setError('You must be logged in to view customers.')
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
          setCustomer(data.data)
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        router.push('/customers')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete customer')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete customer')
    } finally {
      setDeleting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  const getCustomerTypeIcon = (type: string) => {
    const IconComponent = type === 'business' ? Building2 : User
    return <IconComponent className="h-5 w-5" />
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'MMK': 'K',
      'USD': '$',
      'SGD': 'S$',
      'EUR': '€',
      'GBP': '£'
    }
    return `${symbols[currency] || currency}${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.displayName || customer.name}</h1>
            <p className="text-gray-600 mt-1">Customer Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push(`/customers/${customer.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Customer
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Customer Overview Card */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <div className="h-8 w-8 text-blue-600">
                  {getCustomerTypeIcon(customer.customerType)}
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900">
                  {customer.displayName || customer.name}
                </CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={getPriorityColor(customer.priority)}>
                    {customer.priority}
                  </Badge>
                  <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {customer.customerType}
                  </Badge>
                  {customer.companyId && (
                    <Badge variant="outline" className="text-sm">
                      ID: {customer.companyId}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              {customer.openingBalance && (
                <>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(customer.openingBalance, customer.currency)}
                  </div>
                  <div className="text-sm text-gray-600">Opening Balance</div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-600" />
                Basic Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Type:</span>
                  <span className="font-medium capitalize">{customer.customerType}</span>
                </div>
                {customer.salutation && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Salutation:</span>
                    <span className="font-medium">{customer.salutation}</span>
                  </div>
                )}
                {customer.firstName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">First Name:</span>
                    <span className="font-medium">{customer.firstName}</span>
                  </div>
                )}
                {customer.lastName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Name:</span>
                    <span className="font-medium">{customer.lastName}</span>
                  </div>
                )}
                {customer.companyName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company Name:</span>
                    <span className="font-medium">{customer.companyName}</span>
                  </div>
                )}
                {customer.industry && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Industry:</span>
                    <span className="font-medium">{customer.industry}</span>
                  </div>
                )}
                {customer.source && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source:</span>
                    <span className="font-medium">{customer.source}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Contact Information
              </h3>
              <div className="space-y-3">
                {customer.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-blue-600">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{customer.phone}</span>
                  </div>
                )}
                {customer.mobile && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span className="font-medium">{customer.mobile}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Financial Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Currency:</span>
                <span className="font-medium">{customer.currency}</span>
              </div>
              {customer.taxRate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Rate:</span>
                  <span className="font-medium">{customer.taxRate}</span>
                </div>
              )}
              {customer.paymentTerms && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Terms:</span>
                  <span className="font-medium">{customer.paymentTerms}</span>
                </div>
              )}
            </div>
          </div>

          {/* Portal Settings */}
          {customer.enablePortal && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Portal Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Portal Access:</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
                {customer.portalLanguage && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Language:</span>
                    <span className="font-medium">{customer.portalLanguage}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {(customer.notes || customer.remarks) && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.notes && (
                  <div>
                    <span className="text-gray-600 font-medium">Notes:</span>
                    <p className="text-gray-900 mt-1">{customer.notes}</p>
                  </div>
                )}
                {customer.remarks && (
                  <div>
                    <span className="text-gray-600 font-medium">Remarks:</span>
                    <p className="text-gray-900 mt-1">{customer.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Created: {formatDate(customer.createdAt)}</span>
              <span>•</span>
              <span>Updated: {formatDate(customer.updatedAt)}</span>
              {customer.lastContactAt && (
                <>
                  <span>•</span>
                  <span>Last Contact: {formatDate(customer.lastContactAt)}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
