'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  ShoppingCart, 
  Edit,
  ArrowLeft,
  DollarSign,
  Hash,
  Building2,
  FileText,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  Image as ImageIcon,
  AlertCircle,
  Warehouse,
  BarChart3,
  History,
  Star
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
  trackInventory?: boolean
  inventoryLevels?: Array<{
    warehouseId: string
    warehouseName: string
    totalQuantity: number
    averageCost: number
    totalValue: number
  }>
  salesAccount?: {
    id: string
    name: string
    code: string
    type: string
    description?: string
  }
  purchaseAccount?: {
    id: string
    name: string
    code: string
    type: string
    description?: string
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ItemViewPage() {
  const router = useRouter()
  const params = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadItem = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
        const res = await fetch(`/api/items/${params.id}`, { 
          headers: { Authorization: token ? `Bearer ${token}` : '' } 
        })
        const data = await res.json()
        if (data.success) {
          setItem(data.data)
        } else {
          setError(data.error || 'Failed to load item')
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load item')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadItem()
    }
  }, [params.id])

  const getItemTypeIcon = (type: string) => {
    return type === 'goods' ? Package : ShoppingCart
  }

  const getItemTypeLabel = (type: string) => {
    return type === 'goods' ? 'Goods' : 'Service'
  }

  const getItemTypeColor = (type: string) => {
    return type === 'goods' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const getCurrencySymbol = (currencyCode: string) => {
    switch (currencyCode) {
      case 'MMK': return 'K'
      case 'USD': return '$'
      case 'SGD': return 'S$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      default: return currencyCode
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading item details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Item</h2>
          <p className="text-gray-600 mb-6">{error || 'Item not found'}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const Icon = getItemTypeIcon(item.type)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-600 mt-1">Item Details</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/items/${item.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Item
        </Button>
      </div>

      {/* Item Overview Card */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Icon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900">
                  {item.name}
                </CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={getItemTypeColor(item.type)}>
                    {getItemTypeLabel(item.type)}
                  </Badge>
                  <Badge variant={item.isActive ? 'default' : 'secondary'}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {item.sku && (
                    <Badge variant="outline" className="text-sm">
                      SKU: {item.sku}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {getCurrencySymbol(item.currency)}
                {item.sellingPrice.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Selling Price</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="warehouses" className="flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                Warehouses
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Item Type:</span>
                      <span className="font-medium">{getItemTypeLabel(item.type)}</span>
                    </div>
                    {item.sku && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">SKU:</span>
                        <span className="font-medium">{item.sku}</span>
                      </div>
                    )}
                    {item.unit && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unit:</span>
                        <span className="font-medium">{item.unit}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency:</span>
                      <span className="font-medium">{item.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{item.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>

                {/* Pricing Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    Pricing Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-medium text-green-600">
                        {getCurrencySymbol(item.currency)}
                        {item.sellingPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost Price:</span>
                      <span className="font-medium text-red-600">
                        {getCurrencySymbol(item.currency)}
                        {item.costPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profit Margin:</span>
                      <span className={`font-medium ${item.sellingPrice > item.costPrice ? 'text-green-600' : 'text-red-600'}`}>
                        {getCurrencySymbol(item.currency)}
                        {(item.sellingPrice - item.costPrice).toLocaleString()}
                      </span>
                    </div>
                    {item.type === 'goods' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stock on Hand:</span>
                        <span className={`font-medium ${item.stockOnHand && item.stockOnHand > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.stockOnHand?.toFixed(2) || '0.00'} {item.unit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Description
                  </h3>
                  <p className="text-gray-700">{item.description}</p>
                </div>
              )}

              {/* Chart of Accounts Integration */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Chart of Accounts Integration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sales Account */}
                  {item.salesAccount && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">Sales Account</span>
                        </div>
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          Linked
                        </Badge>
                      </div>
                      <div className="text-sm text-blue-800">
                        <div className="font-medium">
                          {item.salesAccount.code} - {item.salesAccount.name}
                        </div>
                        <div className="text-blue-600">
                          Type: {item.salesAccount.type}
                        </div>
                        {item.salesAccount.description && (
                          <div className="mt-1 text-blue-600">
                            {item.salesAccount.description}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Purchase Account */}
                  {item.purchaseAccount && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-900">Purchase Account</span>
                        </div>
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          Linked
                        </Badge>
                      </div>
                      <div className="text-sm text-green-800">
                        <div className="font-medium">
                          {item.purchaseAccount.code} - {item.purchaseAccount.name}
                        </div>
                        <div className="text-green-600">
                          Type: {item.purchaseAccount.type}
                        </div>
                        {item.purchaseAccount.description && (
                          <div className="mt-1 text-green-600">
                            {item.purchaseAccount.description}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="warehouses" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Stock Locations
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      Accounting Stock
                    </Badge>
                    <Badge variant="secondary" className="text-gray-700">
                      Physical Stock
                    </Badge>
                  </div>
                </div>

                {item.type === 'goods' && item.trackInventory && item.inventoryLevels && item.inventoryLevels.length > 0 ? (
                  <div className="space-y-4">
                    {/* Warehouse Table Header */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-5 gap-4 p-4 text-sm font-medium text-gray-600 border-b">
                        <div>WAREHOUSE NAME</div>
                        <div className="text-center">STOCK ON HAND</div>
                        <div className="text-center">COMMITTED STOCK</div>
                        <div className="text-center">AVAILABLE FOR SALE</div>
                        <div className="text-right">ACTIONS</div>
                      </div>
                      
                      {/* Warehouse Rows */}
                      {item.inventoryLevels.map((level: any, index: number) => (
                        <div key={index} className="grid grid-cols-5 gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900">{level.warehouseName}</div>
                              {level.warehouseId === 'warehouse_1756002103536' && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <span className="text-xs text-yellow-600">Default</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">{level.totalQuantity.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{item.unit || 'units'}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">0.00</div>
                            <div className="text-xs text-gray-500">{item.unit || 'units'}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-green-600">{level.totalQuantity.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{item.unit || 'units'}</div>
                          </div>
                          <div className="text-right">
                            <Button variant="outline" size="sm">
                              Adjust Stock
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Stock on Hand</p>
                              <p className="text-2xl font-bold text-gray-900">{item.stockOnHand?.toFixed(2) || '0.00'}</p>
                            </div>
                            <Package className="h-8 w-8 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Committed Stock</p>
                              <p className="text-2xl font-bold text-gray-900">0.00</p>
                            </div>
                            <Activity className="h-8 w-8 text-orange-600" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Available for Sale</p>
                              <p className="text-2xl font-bold text-green-600">{item.stockOnHand?.toFixed(2) || '0.00'}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Opening Stock Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Opening Stock</span>
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          {item.inventoryLevels.reduce((sum: number, level: any) => sum + level.totalQuantity, 0).toFixed(2)} {item.unit || 'units'}
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700">
                        Total opening stock value: {getCurrencySymbol(item.currency)}
                        {item.inventoryLevels.reduce((sum: number, level: any) => sum + level.totalValue, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Warehouse className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Inventory Tracking</h3>
                    <p className="text-gray-600">This item does not have inventory tracking enabled or has no stock locations.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-6">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction History</h3>
                <p className="text-gray-600">Transaction history will be displayed here.</p>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Item History
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium">{formatDate(item.updatedAt)}</span>
                  </div>
                </div>

                {/* Item Image */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    Item Image
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No image uploaded for this item</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push(`/items/${item.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Item
            </Button>
            <Button variant="outline" onClick={() => router.push('/items')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
            <Button variant="outline" onClick={() => router.push('/accounts')}>
              <Activity className="h-4 w-4 mr-2" />
              View Chart of Accounts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


