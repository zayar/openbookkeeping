'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Customer = { 
  id: string
  name: string
  email?: string
  phone?: string
  customerType: string
  priority: string
  isActive: boolean
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
        
        if (!token) {
          setError('You must be logged in to view customers. Please log in first.')
          setLoading(false)
          return
        }
        
        const res = await fetch(`/api/customers`, { headers: { Authorization: `Bearer ${token}` } })
        
        if (res.status === 401) {
          setError('Your session has expired. Please log in again.')
          localStorage.removeItem('auth_token')
          setLoading(false)
          return
        }
        
        const data = await res.json()
        if (data.success) setCustomers(data.data)
      } catch (error) {
        setError('Failed to load customers. Please try again.')
      } finally { 
        setLoading(false) 
      }
    }
    load()
  }, [])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Link href="/customers/new"><Button>Add Customer</Button></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Your Customers</CardTitle></CardHeader>
        <CardContent>
          {error && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              error.includes('logged in') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'text-red-600'
            }`}>
              {error}
              {error.includes('logged in') && (
                <div className="mt-2">
                  <Link href="/login" className="text-blue-600 hover:text-blue-800 underline">
                    Go to Login
                  </Link>
                </div>
              )}
            </div>
          )}
          {loading ? 'Loading...' : (
            <div className="divide-y">
              {customers.map(customer => (
                <div key={customer.id} className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">
                      {customer.email && <span>{customer.email}</span>}
                      {customer.phone && <span> • {customer.phone}</span>}
                      <span> • {customer.customerType}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(customer.priority)}>{customer.priority}</Badge>
                      <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="space-x-2">
                      <Link href={`/customers/${customer.id}`}><Button variant="outline" size="sm">View</Button></Link>
                      <Link href={`/customers/${customer.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>
                    </div>
                  </div>
                </div>
              ))}
              {customers.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No customers found. <Link href="/customers/new" className="text-blue-600 hover:underline">Add your first customer</Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
