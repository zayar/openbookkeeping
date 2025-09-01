'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, MapPin, Package, Building, Star, Users, Activity } from 'lucide-react'

interface Warehouse {
  id: string
  name: string
  code: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  isActive: boolean
  isDefault: boolean
  branchId?: string
  branch?: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

interface Branch {
  id: string
  name: string
  isActive: boolean
}

export default function WarehousesPage() {
  const { token } = useAuth()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    email: '',
    branchId: '',
    isDefault: false
  })

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    try {
      setLoading(true)
      const [warehousesRes, branchesRes] = await Promise.all([
        fetch('/api/warehouses', { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        fetch('/api/branches', { 
          headers: { Authorization: `Bearer ${token}` } 
        })
      ])

      const [warehousesData, branchesData] = await Promise.all([
        warehousesRes.json(),
        branchesRes.json()
      ])

      if (warehousesData.success) {
        setWarehouses(warehousesData.data)
      } else {
        setError('Failed to load warehouses')
      }

      if (branchesData.success) {
        setBranches(branchesData.data.filter((branch: Branch) => branch.isActive))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      phone: '',
      email: '',
      branchId: '',
      isDefault: false
    })
    setEditingWarehouse(null)
    setShowCreateForm(false)
  }

  const handleEdit = (warehouse: Warehouse) => {
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      postalCode: warehouse.postalCode || '',
      country: warehouse.country || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      branchId: warehouse.branchId || '',
      isDefault: warehouse.isDefault
    })
    setEditingWarehouse(warehouse)
    setShowCreateForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingWarehouse 
        ? `/api/warehouses/${editingWarehouse.id}`
        : '/api/warehouses'
      
      const method = editingWarehouse ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        await loadData()
        resetForm()
      } else {
        setError(data.error || 'Failed to save warehouse')
      }
    } catch (error) {
      console.error('Error saving warehouse:', error)
      setError('Failed to save warehouse')
    }
  }

  const handleDelete = async (warehouseId: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return

    try {
      const response = await fetch(`/api/warehouses/${warehouseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        await loadData()
      } else {
        setError(data.error || 'Failed to delete warehouse')
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error)
      setError('Failed to delete warehouse')
    }
  }

  const toggleDefault = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/warehouses/${warehouseId}/set-default`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        await loadData()
      } else {
        setError(data.error || 'Failed to update default warehouse')
      }
    } catch (error) {
      console.error('Error updating default warehouse:', error)
      setError('Failed to update default warehouse')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading warehouses...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Warehouses</h1>
              <p className="text-gray-600">Manage your warehouse locations and inventory storage</p>
            </div>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Warehouse
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card className="mb-8 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {editingWarehouse ? 'Edit Warehouse' : 'Create New Warehouse'}
              </h2>
              <Button variant="ghost" onClick={resetForm}>×</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Warehouse Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Main Warehouse"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="code">Warehouse Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="MW001"
                  />
                </div>

                <div>
                  <Label htmlFor="branchId">Branch</Label>
                  <select
                    id="branchId"
                    value={formData.branchId}
                    onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Storage Street"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Yangon"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State/Region</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Yangon Region"
                  />
                </div>

                <div>
                  <Label htmlFor="postalCode">ZIP Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="11181"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Myanmar"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+95 1 234 5678"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="warehouse@company.com"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isDefault">Set as default warehouse</Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit">
                  {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Warehouses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map(warehouse => (
            <Card key={warehouse.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">{warehouse.name}</h3>
                  {warehouse.isDefault && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <div className="flex gap-1">
                  <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                    {warehouse.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                {warehouse.code && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>Code: {warehouse.code}</span>
                  </div>
                )}
                
                {warehouse.branch && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>Branch: {warehouse.branch.name}</span>
                  </div>
                )}

                {warehouse.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{warehouse.address}</span>
                  </div>
                )}

                {(warehouse.city || warehouse.state) && (
                  <div className="flex items-center gap-2">
                    <span className="ml-6">
                      {[warehouse.city, warehouse.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                {warehouse.phone && (
                  <div className="flex items-center gap-2">
                    <span className="ml-6">{warehouse.phone}</span>
                  </div>
                )}

                {warehouse.email && (
                  <div className="flex items-center gap-2">
                    <span className="ml-6">{warehouse.email}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(warehouse)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(warehouse.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {!warehouse.isDefault && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleDefault(warehouse.id)}
                    className="text-yellow-600 hover:text-yellow-700"
                  >
                    <Star className="h-4 w-4" />
                    Set Default
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {warehouses.length === 0 && !showCreateForm && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No warehouses found</h3>
            <p className="text-gray-600 mb-4">Create your first warehouse to start managing inventory locations.</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Warehouse
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
