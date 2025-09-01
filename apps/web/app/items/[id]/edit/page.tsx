'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  ShoppingCart, 
  Save,
  ArrowLeft, 
  AlertCircle, 
  Info,
  DollarSign,
  Hash,
  FileText,
  Upload,
  Image as ImageIcon,
  HelpCircle,
  Plus,
  Copy,
  Building2
} from 'lucide-react'

type ChartAccount = {
  id: string
  name: string
  code: string
  type: string
  description?: string
}

type Warehouse = {
  id: string
  name: string
  code: string
  isDefault: boolean
}

type OpeningBalance = {
  warehouseId: string
  warehouseName: string
  openingStock: string
  openingStockValue: string
}

type ItemForm = {
  name: string
  sku: string
  type: 'goods' | 'service'
  unit: string
  description: string
  sellingPrice: string
  costPrice: string
  currency: string
  salesAccountId: string
  purchaseAccountId: string
  trackInventory: boolean
  inventoryAccountId: string
  reorderPoint: string
  taxId?: string
  preferredVendorId?: string
  isActive: boolean
}

const CURRENCIES = [
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' }
]

const UNITS = [
  'pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'sqm', 'hour', 'day', 'month', 'year'
]

export default function EditItemPage() {
  const router = useRouter()
  const params = useParams()
  const [item, setItem] = useState<any>(null)
  const [form, setForm] = useState<ItemForm>({
    name: '',
    sku: '',
    type: 'goods',
    unit: 'pcs',
    description: '',
    sellingPrice: '',
    costPrice: '',
    currency: 'MMK',
    salesAccountId: '',
    purchaseAccountId: '',
    trackInventory: false,
    inventoryAccountId: '',
    reorderPoint: '',
    taxId: '',
    preferredVendorId: '',
    isActive: true
  })
  const [salesAccounts, setSalesAccounts] = useState<ChartAccount[]>([])
  const [purchaseAccounts, setPurchaseAccounts] = useState<ChartAccount[]>([])
  const [stockAccounts, setStockAccounts] = useState<ChartAccount[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadItemAndAccounts = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
        
        // Load item details
        const itemRes = await fetch(`/api/items/${params.id}`, { 
          headers: { Authorization: token ? `Bearer ${token}` : '' } 
        })
        const itemData = await itemRes.json()
        if (itemData.success) {
          setItem(itemData.data)
          setForm({
            name: itemData.data.name,
            sku: itemData.data.sku || '',
            type: itemData.data.type,
            unit: itemData.data.unit || 'pcs',
            description: itemData.data.description || '',
            sellingPrice: itemData.data.sellingPrice?.toString() || '',
            costPrice: itemData.data.costPrice?.toString() || '',
            currency: itemData.data.currency,
            salesAccountId: itemData.data.salesAccount?.id || '',
            purchaseAccountId: itemData.data.purchaseAccount?.id || '',
            trackInventory: itemData.data.trackInventory || false,
            inventoryAccountId: itemData.data.inventoryAccountId || '',
            reorderPoint: itemData.data.reorderPoint?.toString() || '',
            taxId: itemData.data.taxId || '',
            preferredVendorId: itemData.data.preferredVendorId || '',
            isActive: itemData.data.isActive
          })
        } else {
          setError(itemData.error || 'Failed to load item')
        }

        // Load sales accounts (Income accounts)
        const salesRes = await fetch(`/api/accounts?type=income`, { 
          headers: { Authorization: token ? `Bearer ${token}` : '' } 
        })
        const salesData = await salesRes.json()
        if (salesData.success) {
          setSalesAccounts(salesData.data)
        }

        // Load purchase accounts (Expense and COGS accounts)
        const purchaseRes = await fetch(`/api/accounts?type=expense,cost_of_goods_sold`, { 
          headers: { Authorization: token ? `Bearer ${token}` : '' } 
        })
        const purchaseData = await purchaseRes.json()
        if (purchaseData.success) {
          setPurchaseAccounts(purchaseData.data)
        }

        // Load stock accounts (Asset accounts)
        const stockRes = await fetch(`/api/accounts?type=stock`, { 
          headers: { Authorization: token ? `Bearer ${token}` : '' } 
        })
        const stockData = await stockRes.json()
        if (stockData.success) {
          setStockAccounts(stockData.data)
        }

        // Load warehouses
        const warehousesRes = await fetch(`/api/warehouses`, { 
          headers: { Authorization: token ? `Bearer ${token}` : '' } 
        })
        const warehousesData = await warehousesRes.json()
        if (warehousesData.success) {
          setWarehouses(warehousesData.data)
          // Initialize opening balances with existing inventory levels
          if (itemData.data.inventoryLevels && itemData.data.inventoryLevels.length > 0) {
            const existingBalances = itemData.data.inventoryLevels.map((level: any) => ({
              warehouseId: level.warehouseId,
              warehouseName: level.warehouseName,
              openingStock: level.totalQuantity?.toString() || '0',
              openingStockValue: level.averageCost?.toString() || '0'
            }))
            setOpeningBalances(existingBalances)
          } else {
            // Initialize with default warehouse if available
            const defaultWarehouse = warehousesData.data.find((w: Warehouse) => w.isDefault)
            if (defaultWarehouse) {
              setOpeningBalances([{
                warehouseId: defaultWarehouse.id,
                warehouseName: defaultWarehouse.name,
                openingStock: '',
                openingStockValue: ''
              }])
            }
          }
        }
      } catch (error) {
        console.error('Failed to load item or accounts:', error)
        setError('Failed to load item or chart of accounts')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadItemAndAccounts()
    }
  }, [params.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      
      const itemData = {
        ...form,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        costPrice: parseFloat(form.costPrice) || 0,
        reorderPoint: form.trackInventory ? parseFloat(form.reorderPoint) || 0 : undefined,
        stockOnHand: form.type === 'goods' ? (item?.stockOnHand || 0) : undefined,
        unit: form.type === 'goods' ? form.unit : undefined,
        openingBalances: form.trackInventory ? openingBalances.filter(b => 
          b.warehouseId && (parseFloat(b.openingStock) > 0 || parseFloat(b.openingStockValue) > 0)
        ) : []
      }

      const res = await fetch(`/api/items/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(itemData)
      })
      
      const data = await res.json()
      if (data.success) {
        setSuccess('Item updated successfully!')
        setTimeout(() => router.push(`/items/${params.id}`), 1500)
      } else {
        setError(data.error || 'Failed to update item')
      }
    } catch (e: any) { 
      setError(e.message || 'Failed to update item') 
    } finally { 
      setSaving(false) 
    }
  }

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode)
    return currency ? currency.symbol : currencyCode
  }

  const generateSKU = () => {
    if (form.name) {
      const prefix = form.name.substring(0, 3).toUpperCase()
      const timestamp = Date.now().toString().slice(-4)
      setForm({ ...form, sku: `${prefix}${timestamp}` })
    }
  }

  const addWarehouse = () => {
    const availableWarehouses = warehouses.filter(w => 
      !openingBalances.some(b => b.warehouseId === w.id)
    )
    if (availableWarehouses.length > 0) {
      setOpeningBalances([...openingBalances, {
        warehouseId: availableWarehouses[0].id,
        warehouseName: availableWarehouses[0].name,
        openingStock: '',
        openingStockValue: ''
      }])
    }
  }

  const updateOpeningBalance = (index: number, field: keyof OpeningBalance, value: string) => {
    const updated = [...openingBalances]
    updated[index] = { ...updated[index], [field]: value }
    setOpeningBalances(updated)
  }

  const copyToAll = (sourceIndex: number) => {
    const sourceBalance = openingBalances[sourceIndex]
    const updated = openingBalances.map((balance, index) => 
      index === sourceIndex ? balance : {
        ...balance,
        openingStock: sourceBalance.openingStock,
        openingStockValue: sourceBalance.openingStockValue
      }
    )
    setOpeningBalances(updated)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading item and chart of accounts...</p>
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Item</h1>
          <p className="text-gray-600 mt-2">Update item information and chart of accounts integration</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Form */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Package className="h-6 w-6 text-blue-600" />
            Edit Item Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <Info className="h-5 w-5 text-green-500" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-6">
            {/* Item Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Item Type *</Label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    form.type === 'goods' 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setForm({...form, type: 'goods'})}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Package className={`h-8 w-8 ${form.type === 'goods' ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div>
                      <div className={`font-medium ${form.type === 'goods' ? 'text-blue-900' : 'text-gray-900'}`}>
                        Goods
                      </div>
                      <div className={`text-xs ${form.type === 'goods' ? 'text-blue-700' : 'text-gray-500'}`}>
                        Physical inventory items
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    form.type === 'service' 
                      ? 'border-green-500 bg-green-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setForm({...form, type: 'service'})}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <ShoppingCart className={`h-8 w-8 ${form.type === 'service' ? 'text-green-600' : 'text-gray-500'}`} />
                    <div>
                      <div className={`font-medium ${form.type === 'service' ? 'text-green-900' : 'text-gray-900'}`}>
                        Service
                      </div>
                      <div className={`text-xs ${form.type === 'service' ? 'text-green-700' : 'text-gray-500'}`}>
                        Non-physical services
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Enter item name"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="text-sm font-medium text-gray-700">
                  SKU
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={e => setForm({...form, sku: e.target.value})}
                    placeholder="Enter SKU"
                    className="h-11"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={generateSKU}
                    className="px-3"
                  >
                    Auto
                  </Button>
                </div>
              </div>

              {form.type === 'goods' && (
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm font-medium text-gray-700">
                    Unit
                  </Label>
                  <select 
                    className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.unit} 
                    onChange={(e) => setForm({...form, unit: e.target.value})}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                  Currency *
                </Label>
                <select 
                  className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.currency} 
                  onChange={(e) => setForm({...form, currency: e.target.value})}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol}) - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sales Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="salesEnabled"
                  checked={true}
                  disabled
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="salesEnabled" className="text-lg font-medium text-gray-900">
                  Sales Information
                </Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice" className="text-sm font-medium text-gray-700">
                    Selling Price *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      {getCurrencySymbol(form.currency)}
                    </span>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      value={form.sellingPrice}
                      onChange={e => setForm({...form, sellingPrice: e.target.value})}
                      placeholder="0.00"
                      required
                      className="h-11 pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesAccountId" className="text-sm font-medium text-gray-700">
                    Sales Account *
                  </Label>
                  <select 
                    className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.salesAccountId} 
                    onChange={(e) => setForm({...form, salesAccountId: e.target.value})}
                    required
                  >
                    <option value="">Select Sales Account</option>
                    {salesAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesDescription" className="text-sm font-medium text-gray-700">
                  Sales Description
                </Label>
                <textarea
                  id="salesDescription"
                  placeholder="Enter description for sales purposes..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Purchase Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="purchaseEnabled"
                  checked={true}
                  disabled
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="purchaseEnabled" className="text-lg font-medium text-gray-900">
                  Purchase Information
                </Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="text-sm font-medium text-gray-700">
                    Cost Price *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      {getCurrencySymbol(form.currency)}
                    </span>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      value={form.costPrice}
                      onChange={e => setForm({...form, costPrice: e.target.value})}
                      placeholder="0.00"
                      required
                      className="h-11 pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseAccountId" className="text-sm font-medium text-gray-700">
                    Purchase Account *
                  </Label>
                  <select 
                    className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.purchaseAccountId} 
                    onChange={(e) => setForm({...form, purchaseAccountId: e.target.value})}
                    required
                  >
                    <option value="">Select Purchase Account</option>
                    {purchaseAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDescription" className="text-sm font-medium text-gray-700">
                  Purchase Description
                </Label>
                <textarea
                  id="purchaseDescription"
                  placeholder="Enter description for purchase purposes..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Inventory Tracking - Only for Goods */}
            {form.type === 'goods' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="trackInventory"
                    checked={form.trackInventory}
                    onChange={(e) => setForm({...form, trackInventory: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="trackInventory" className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    Track Inventory for this item
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Label>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  You cannot enable/disable inventory tracking once you've created transactions for this item
                </p>
                
                {form.trackInventory && (
                  <div className="ml-7 space-y-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {/* Inventory Account */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="inventoryAccountId" className="text-sm font-medium text-gray-700">
                          Inventory Account *
                        </Label>
                        <select 
                          id="inventoryAccountId"
                          className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={form.inventoryAccountId} 
                          onChange={(e) => setForm({...form, inventoryAccountId: e.target.value})}
                          required={form.trackInventory}
                        >
                          <option value="">Select an account</option>
                          <optgroup label="Stock">
                            {stockAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="valuationMethod" className="text-sm font-medium text-gray-700">
                          Inventory Valuation Method *
                        </Label>
                        <select 
                          id="valuationMethod"
                          className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                          value="FIFO"
                          disabled
                        >
                          <option value="FIFO">FIFO (First In First Out)</option>
                        </select>
                      </div>
                    </div>

                    {/* Reorder Point */}
                    <div className="w-full md:w-1/2">
                      <Label htmlFor="reorderPoint" className="text-sm font-medium text-gray-700">
                        Reorder Point
                      </Label>
                      <Input
                        id="reorderPoint"
                        type="number"
                        step="0.01"
                        value={form.reorderPoint}
                        onChange={e => setForm({...form, reorderPoint: e.target.value})}
                        placeholder="0"
                        className="h-11"
                      />
                    </div>

                    {/* Current Inventory Display */}
                    {item && item.inventoryLevels && item.inventoryLevels.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          Current Inventory Levels
                        </h4>
                        <div className="space-y-3">
                          {item.inventoryLevels.map((level: any, index: number) => (
                            <div key={index} className="bg-white border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-blue-900">{level.warehouseName}</span>
                                <span className="text-sm text-blue-700">
                                  {level.totalQuantity} {item.unit || 'units'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm text-blue-600">
                                <div>
                                  <span>Quantity:</span>
                                  <div className="font-medium text-blue-900">{level.totalQuantity}</div>
                                </div>
                                <div>
                                  <span>Avg Cost:</span>
                                  <div className="font-medium text-blue-900">
                                    {getCurrencySymbol(item.currency)}{level.averageCost?.toFixed(2) || '0.00'}
                                  </div>
                                </div>
                                <div>
                                  <span>Total Value:</span>
                                  <div className="font-medium text-blue-900">
                                    {getCurrencySymbol(item.currency)}{level.totalValue?.toFixed(2) || '0.00'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Opening Stock Management */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-gray-900">Adjust Opening Stock</h4>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (openingBalances.length > 0) {
                                copyToAll(0)
                              }
                            }}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            COPY TO ALL
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden bg-white">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
                            <div>WAREHOUSE NAME</div>
                            <div>OPENING STOCK</div>
                            <div>OPENING STOCK VALUE PER UNIT</div>
                          </div>
                        </div>
                        
                        <div className="divide-y">
                          {openingBalances.map((balance, index) => (
                            <div key={index} className="px-4 py-3">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="flex items-center">
                                  <select
                                    className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={balance.warehouseId}
                                    onChange={(e) => {
                                      const warehouse = warehouses.find(w => w.id === e.target.value)
                                      updateOpeningBalance(index, 'warehouseId', e.target.value)
                                      updateOpeningBalance(index, 'warehouseName', warehouse?.name || '')
                                    }}
                                  >
                                    <option value="">Select warehouse</option>
                                    {warehouses.map((warehouse) => (
                                      <option key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={balance.openingStock}
                                    onChange={e => updateOpeningBalance(index, 'openingStock', e.target.value)}
                                    placeholder="0"
                                    className="h-10"
                                  />
                                </div>
                                <div>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={balance.openingStockValue}
                                    onChange={e => updateOpeningBalance(index, 'openingStockValue', e.target.value)}
                                    placeholder="0"
                                    className="h-10"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={addWarehouse}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Warehouses
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                General Description
              </Label>
              <textarea
                id="description"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Enter general description of the item..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Item Image
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-600">
                  <p className="mb-2">Drag image(s) here or</p>
                  <Button type="button" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Browse images
                  </Button>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({...form, isActive: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Item is active
                </Label>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Chart of Accounts Integration</p>
                    <p>Changes to this item will automatically update the linked Chart of Accounts entries to maintain consistency.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={saving}
                className="px-8 h-11 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating Item...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Update Item
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


