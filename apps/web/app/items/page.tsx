'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  DollarSign,
  ShoppingCart,
  Building2,
  MoreHorizontal
} from 'lucide-react'

type Item = {
  id: string
  name: string
  sku?: string
  type: 'goods' | 'service'
  unit?: string
  description?: string
  sellingPrice: number
  costPrice: number
  currency: string
  stockOnHand?: number
  salesAccount?: {
    id: string
    name: string
    code: string
  }
  purchaseAccount?: {
    id: string
    name: string
    code: string
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ItemsPage() {
  const router = useRouter()
  const { token, user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'goods' | 'service'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'created'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const loadItems = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/items`, { 
          headers: { Authorization: `Bearer ${token}` } 
        })
        const data = await res.json()
        if (data.success) {
          setItems(data.data)
        }
      } catch (error) {
        console.error('Failed to load items:', error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [token])

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <p>Please log in to view items.</p>
        <Link href="/login">
          <Button className="mt-4">Login</Button>
        </Link>
      </div>
    )
  }

  const getFilteredAndSortedItems = () => {
    let filtered = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesType = filterType === 'all' || item.type === filterType
      return matchesSearch && matchesType
    })

    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'price':
          aValue = a.sellingPrice
          bValue = b.sellingPrice
          break
        case 'stock':
          aValue = a.stockOnHand || 0
          bValue = b.stockOnHand || 0
          break
        case 'created':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'MMK': return 'K'
      case 'USD': return '$'
      case 'SGD': return 'S$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      default: return currency
    }
  }

  const getItemTypeIcon = (type: string) => {
    const IconComponent = type === 'goods' ? Package : ShoppingCart
    return <IconComponent className="h-5 w-5" />
  }

  const getItemTypeLabel = (type: string) => {
    return type === 'goods' ? 'Goods' : 'Service'
  }

  const getItemTypeColor = (type: string) => {
    return type === 'goods' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const filteredItems = getFilteredAndSortedItems()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Items</h1>
          <p className="text-gray-600 mt-2">Manage your inventory and service items</p>
        </div>
        <Link href="/items/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="goods">Goods</option>
                  <option value="service">Services</option>
                </select>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
                <option value="created">Created Date</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first item'
                }
              </p>
              {!searchTerm && filterType === 'all' && (
                <Link href="/items/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Item
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span>NAME</span>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">TYPE</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">PURCHASE RATE</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">SELLING RATE</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">STOCK ON HAND</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ACCOUNTS</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            {getItemTypeIcon(item.type)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">
                          {item.sku || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getItemTypeColor(item.type)}>
                          {getItemTypeLabel(item.type)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <span className="text-gray-600">
                            {getCurrencySymbol(item.currency)}
                            {item.costPrice.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium">
                          <span className="text-gray-900">
                            {getCurrencySymbol(item.currency)}
                            {item.sellingPrice.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          {item.type === 'goods' ? (
                            <span className={`font-medium ${item.stockOnHand && item.stockOnHand > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.stockOnHand?.toFixed(2) || '0.00'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {item.salesAccount && (
                            <div className="text-xs">
                              <span className="text-gray-500">Sales: </span>
                              <span className="text-blue-600 font-medium">
                                {item.salesAccount.code} - {item.salesAccount.name}
                              </span>
                            </div>
                          )}
                          {item.purchaseAccount && (
                            <div className="text-xs">
                              <span className="text-gray-500">Purchase: </span>
                              <span className="text-green-600 font-medium">
                                {item.purchaseAccount.code} - {item.purchaseAccount.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/items/${item.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/items/${item.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


