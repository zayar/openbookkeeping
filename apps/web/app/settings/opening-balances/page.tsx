'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Settings, 
  Search, 
  Package, 
  Warehouse,
  DollarSign,
  FileText,
  AlertCircle,
  Info
} from 'lucide-react'
import Link from 'next/link'

type OpeningBalance = {
  id: string
  itemId: string
  warehouseId: string
  quantity: number
  unitCost: number
  totalValue: number
  asOfDate: string
  products: {
    id: string
    name: string
    sku: string
    unit: string
  }
  warehouses: {
    id: string
    name: string
  }
  journals: {
    id: string
    journalNumber: string
    journalDate: string
  } | null
}

export default function OpeningBalancesPage() {
  const { token, user } = useAuth()
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      loadOpeningBalances()
    }
  }, [token])

  const loadOpeningBalances = async () => {
    try {
      const response = await fetch('/api/opening-balances', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const data = await response.json()
      if (data.success) {
        setOpeningBalances(data.data)
      } else {
        setError('Failed to load opening balances')
      }
    } catch (error) {
      console.error('Error loading opening balances:', error)
      setError('Failed to load opening balances')
    } finally {
      setLoading(false)
    }
  }

  const filteredBalances = openingBalances.filter(balance =>
    balance.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.products.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.warehouses.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate totals
  const totalDebit = filteredBalances.reduce((sum, balance) => sum + balance.totalValue, 0)
  const totalCredit = totalDebit // Should be equal in double-entry

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <p>Please log in to view opening balances.</p>
        <Link href="/login">
          <Button className="mt-4">Login</Button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading opening balances...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-gray-500 hover:text-gray-700">
            <Settings className="h-5 w-5" />
          </Link>
          <span className="text-gray-400">/</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Opening Balances</h1>
            <p className="text-gray-600">Asset → Inventory Asset</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Opening Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Opening Balances Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBalances.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Opening Balances</h3>
              <p className="text-gray-600 mb-4">
                Create items with inventory tracking enabled to see opening balances here.
              </p>
              <Link href="/items/new">
                <Button>
                  <Package className="h-4 w-4 mr-2" />
                  Create Inventory Item
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBalances.map((balance) => (
                    <tr key={balance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {balance.products.name}
                            </div>
                            {balance.products.sku && (
                              <div className="text-sm text-gray-500">
                                SKU: {balance.products.sku}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Warehouse className="h-4 w-4 text-gray-400 mr-2" />
                          {balance.warehouses.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        MMK
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-blue-600 mr-1" />
                          {balance.quantity} {balance.products.unit || 'units'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-600 mr-1" />
                          MMK{balance.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                          MMK{balance.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        -
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals Row */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-4 text-sm text-gray-900" colSpan={6}>
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                        MMK{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                        MMK{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Opening Balances Information</p>
            <p>
              Opening balances represent the initial inventory values when you start tracking items. 
              These create journal entries that debit your Inventory Asset accounts and credit Opening Balance Equity.
              You can only edit opening balances until the first non-opening transaction is created for each item.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

