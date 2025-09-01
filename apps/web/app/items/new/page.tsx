'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Package, 
  ShoppingCart, 
  Save, 
  ArrowLeft, 
  AlertCircle, 
  Info,
  Plus,
  Copy,
  Warehouse,
  HelpCircle
} from 'lucide-react'
import Link from 'next/link'

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
  code?: string
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

export default function NewItemPage() {
  const router = useRouter()
  const { token, user } = useAuth()
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
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    try {
      const [accountsRes, warehousesRes] = await Promise.all([
        fetch('/api/accounts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/warehouses', { headers: { Authorization: `Bearer ${token}` } })
      ])

      const [accountsData, warehousesData] = await Promise.all([
        accountsRes.json(),
        warehousesRes.json()
      ])

      if (accountsData.success) {
        const accounts = accountsData.data
        const salesAccounts = accounts.filter((acc: ChartAccount) => acc.type === 'income' || acc.type === 'revenue')
        const purchaseAccounts = accounts.filter((acc: ChartAccount) => acc.type === 'expense' || acc.type === 'cost_of_goods_sold')
        const stockAccounts = accounts.filter((acc: ChartAccount) => acc.type === 'stock')
        
        setSalesAccounts(salesAccounts)
        setPurchaseAccounts(purchaseAccounts)
        setStockAccounts(stockAccounts)
        
        // Set default accounts if not already set
        if (!form.salesAccountId) {
          const defaultSalesAccount = salesAccounts.find(acc => acc.name === 'Sales Revenue' || acc.name === 'Sales')
          if (defaultSalesAccount) {
            setForm(prev => ({ ...prev, salesAccountId: defaultSalesAccount.id }))
          }
        }
        
        if (!form.purchaseAccountId) {
          const defaultPurchaseAccount = purchaseAccounts.find(acc => acc.name === 'Cost of Goods Sold')
          if (defaultPurchaseAccount) {
            setForm(prev => ({ ...prev, purchaseAccountId: defaultPurchaseAccount.id }))
          }
        }
      }

      if (warehousesData.success) {
        setWarehouses(warehousesData.data)
        // Initialize opening balances with all warehouses
        const initialBalances = warehousesData.data.map((warehouse: Warehouse) => ({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          openingStock: '',
          openingStockValue: ''
        }))
        setOpeningBalances(initialBalances)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('Failed to load required data')
    } finally {
      setLoading(false)
    }
  }

  const addWarehouse = () => {
    const newWarehouse = {
      warehouseId: `temp_${Date.now()}`,
      warehouseName: 'New Warehouse',
      openingStock: '',
      openingStockValue: ''
    }
    setOpeningBalances([...openingBalances, newWarehouse])
  }

  const updateOpeningBalance = (index: number, field: keyof OpeningBalance, value: string) => {
    const updated = [...openingBalances]
    updated[index] = { ...updated[index], [field]: value }
    setOpeningBalances(updated)
  }

  const copyToAll = (sourceIndex: number) => {
    const sourceBalance = openingBalances[sourceIndex]
    const updated = openingBalances.map((balance, index) => ({
      ...balance,
      openingStock: index === sourceIndex ? balance.openingStock : sourceBalance.openingStock,
      openingStockValue: index === sourceIndex ? balance.openingStockValue : sourceBalance.openingStockValue
    }))
    setOpeningBalances(updated)
  }

  const removeWarehouse = (index: number) => {
    if (openingBalances.length > 1) {
      const updated = openingBalances.filter((_, i) => i !== index)
      setOpeningBalances(updated)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      // Validate inventory tracking requirements
      if (form.trackInventory && !form.inventoryAccountId) {
        setError('Inventory Account is required when inventory tracking is enabled')
        setSaving(false)
        return
      }

      // Validate opening balances
      if (form.trackInventory) {
        for (const balance of openingBalances) {
          if (balance.openingStock && !balance.openingStockValue) {
            setError('Opening Stock Value per Unit is required when Opening Stock is provided')
            setSaving(false)
            return
          }
          if (!balance.openingStock && balance.openingStockValue) {
            setError('Opening Stock is required when Opening Stock Value per Unit is provided')
            setSaving(false)
            return
          }
        }
      }

      const itemData = {
        ...form,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        costPrice: parseFloat(form.costPrice) || 0,
        reorderPoint: parseFloat(form.reorderPoint) || 0,
        organizationId: 'cmefcazyk0003eo15jf5azevc',
        openingBalances: form.trackInventory ? openingBalances.filter(b => 
          b.openingStock && b.openingStockValue && parseFloat(b.openingStock) > 0
        ).map(b => ({
          warehouseId: b.warehouseId,
          quantity: parseFloat(b.openingStock),
          unitCost: parseFloat(b.openingStockValue)
        })) : []
      }

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(itemData)
      })
      
      const data = await res.json()
      if (data.success) {
        setSuccess('Item created successfully!')
        setTimeout(() => router.push('/items'), 1500)
      } else {
        setError(data.error || 'Failed to create item')
      }
    } catch (e: any) { 
      setError(e.message || 'Failed to create item') 
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

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p>Please log in to create items.</p>
        <Link href="/login">
          <Button className="mt-4">Login</Button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Item</h1>
          <p className="text-gray-600 mt-2">Create a new inventory item or service</p>
        </div>
        <Link href="/items">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Info className="h-5 w-5 text-green-500" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Item Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Type *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="goods"
                    checked={form.type === 'goods'}
                    onChange={(e) => setForm({...form, type: e.target.value as 'goods' | 'service'})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Goods</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="service"
                    checked={form.type === 'service'}
                    onChange={(e) => setForm({...form, type: e.target.value as 'goods' | 'service'})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Service</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Enter item name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sku">SKU</Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={e => setForm({...form, sku: e.target.value})}
                    placeholder="Enter SKU"
                  />
                  <Button type="button" variant="outline" onClick={generateSKU}>
                    Auto
                  </Button>
                </div>
              </div>
            </div>

            {form.type === 'goods' && (
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <select 
                  id="unit"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.unit} 
                  onChange={(e) => setForm({...form, unit: e.target.value})}
                >
                  <option value="">Select or type to add</option>
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.type === 'goods' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="returnable"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="returnable" className="text-sm text-gray-700">
                  Returnable Item
                </Label>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Sales Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sellingPrice">Selling Price *</Label>
                <div className="flex">
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={e => setForm({...form, sellingPrice: e.target.value})}
                    placeholder="0.00"
                    required
                    className="rounded-r-none"
                  />
                  <div className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-md px-3 py-2 text-gray-600 text-sm">
                    {form.currency}
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="salesAccountId">Account *</Label>
                <select 
                  id="salesAccountId"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.salesAccountId} 
                  onChange={(e) => setForm({...form, salesAccountId: e.target.value})}
                  required
                >
                  <option value="">Sales</option>
                  {salesAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  All sales transactions for this item will be tracked under this account
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="salesDescription">Description</Label>
              <Textarea
                id="salesDescription"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Enter description..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Purchase Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Purchase Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costPrice">Cost Price *</Label>
                <div className="flex">
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={form.costPrice}
                    onChange={e => setForm({...form, costPrice: e.target.value})}
                    placeholder="0.00"
                    required
                    className="rounded-r-none"
                  />
                  <div className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-md px-3 py-2 text-gray-600 text-sm">
                    {form.currency}
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="purchaseAccountId">Account *</Label>
                <select 
                  id="purchaseAccountId"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.purchaseAccountId} 
                  onChange={(e) => setForm({...form, purchaseAccountId: e.target.value})}
                  required
                >
                  <option value="">Cost of Goods Sold</option>
                  {purchaseAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Tracking - Only for Goods */}
        {form.type === 'goods' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trackInventory"
                  checked={form.trackInventory}
                  onChange={(e) => setForm({...form, trackInventory: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Track Inventory for this item
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </CardTitle>
              <p className="text-sm text-gray-600">
                You cannot enable/disable inventory tracking once you've created transactions for this item
              </p>
            </CardHeader>
            
            {form.trackInventory && (
              <CardContent className="space-y-6">
                {/* Inventory Account */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inventoryAccountId">Inventory Account *</Label>
                    <select 
                      id="inventoryAccountId"
                      className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.inventoryAccountId} 
                      onChange={(e) => setForm({...form, inventoryAccountId: e.target.value})}
                      required
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
                  
                  <div>
                    <Label htmlFor="valuationMethod">Inventory Valuation Method *</Label>
                    <select 
                      id="valuationMethod"
                      className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                      value="FIFO"
                      disabled
                    >
                      <option value="FIFO">FIFO (First In First Out)</option>
                    </select>
                  </div>
                </div>

                {/* Reorder Point */}
                <div className="w-full md:w-1/2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    step="0.01"
                    value={form.reorderPoint}
                    onChange={e => setForm({...form, reorderPoint: e.target.value})}
                    placeholder="0"
                  />
                </div>

                {/* Opening Stock Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Opening Stock</h3>
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

                  <div className="border rounded-lg overflow-hidden">
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
                              />
                            </div>
                            <div>
                              <Input
                                type="number"
                                step="0.01"
                                value={balance.openingStockValue}
                                onChange={e => updateOpeningBalance(index, 'openingStockValue', e.target.value)}
                                placeholder="0"
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
              </CardContent>
            )}
          </Card>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-6">
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
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Item...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Create Item
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}