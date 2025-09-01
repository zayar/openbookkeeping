'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { LogoutDialog } from '@/components/ui/logout-dialog'

export default function DashboardPage() {
  const router = useRouter()
  const { token, user } = useAuth()
  const [metrics, setMetrics] = useState<{itemsCount:number;accountsCount:number;bankAccountsCount:number;customersCount:number;vendorsCount:number}>({itemsCount:0,accountsCount:0,bankAccountsCount:0,customersCount:0,vendorsCount:0})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/metrics', { 
          headers: { Authorization: `Bearer ${token}` } 
        })
        const data = await res.json()
        if (data.success) setMetrics(data.data)
      } catch (error) {
        console.error('Failed to load metrics:', error)
      } finally { 
        setLoading(false) 
      }
    }
    load()
  }, [token])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Please log in to view your dashboard.</p>
          <Button onClick={() => router.push('/login')}>Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome to your accounting dashboard</p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={() => router.push('/accounts')}>Chart of Accounts</Button>
              <Button onClick={() => router.push('/items')}>Items</Button>
              <LogoutDialog onLogout={() => useAuth().logout()} variant="danger" size="md" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Products and services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : metrics.itemsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Chart of accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : metrics.accountsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>Connected accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : metrics.bankAccountsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Active customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : metrics.customersCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Vendors</CardTitle>
              <CardDescription>Suppliers & contractors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : metrics.vendorsCount}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
