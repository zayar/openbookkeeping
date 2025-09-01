'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Plus, Edit, Trash2, Star, MapPin, Phone, Globe } from 'lucide-react'

interface Branch {
  id: string
  name: string
  addressLine1?: string
  city?: string
  state?: string
  country: string
  phone?: string
  website?: string
  defaultTransactionSeries?: string
  isDefault: boolean
}

export default function BranchesPage() {
  const { token } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Myanmar',
    phone: '',
    fax: '',
    website: '',
    defaultTransactionSeries: '',
    isDefault: false
  })

  useEffect(() => {
    if (token) {
      loadBranches()
    }
  }, [token])

  const loadBranches = async () => {
    try {
      const response = await fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBranches(data.data || [])
      } else {
        console.error('Failed to load branches')
      }
    } catch (error) {
      console.error('Error loading branches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingBranch 
        ? `/api/branches/${editingBranch.id}`
        : '/api/branches'
      
      const method = editingBranch ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          organizationId: 'cmefcazyk0003eo15jf5azevc'
        })
      })
      
      if (response.ok) {
        await loadBranches()
        setShowModal(false)
        setEditingBranch(null)
        setFormData({
          name: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Myanmar',
          phone: '',
          fax: '',
          website: '',
          defaultTransactionSeries: '',
          isDefault: false
        })
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving branch:', error)
      alert('Failed to save branch')
    }
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setFormData({
      name: branch.name,
      addressLine1: branch.addressLine1 || '',
      addressLine2: '',
      city: branch.city || '',
      state: branch.state || '',
      postalCode: '',
      country: branch.country,
      phone: branch.phone || '',
      fax: '',
      website: branch.website || '',
      defaultTransactionSeries: branch.defaultTransactionSeries || '',
      isDefault: branch.isDefault
    })
    setShowModal(true)
  }

  const handleDelete = async (branchId: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return
    
    try {
      const response = await fetch(`/api/branches/${branchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        await loadBranches()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting branch:', error)
      alert('Failed to delete branch')
    }
  }

  const toggleDefault = async (branchId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/branches/${branchId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isDefault: !currentStatus })
      })
      
      if (response.ok) {
        await loadBranches()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating branch status:', error)
      alert('Failed to update branch status')
    }
  }

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.state?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">Loading branches...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-600">Manage your business branches and locations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Branch
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search branches..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Branches Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Default Transaction Number Series
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBranches.map((branch) => (
              <tr key={branch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {branch.name}
                    </span>
                    {branch.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 ml-2" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {branch.defaultTransactionSeries || 'Default Transaction Series'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    {[branch.city, branch.state, branch.country].filter(Boolean).join(', ')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="space-y-1">
                    {branch.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-1" />
                        {branch.phone}
                      </div>
                    )}
                    {branch.website && (
                      <div className="flex items-center text-gray-600">
                        <Globe className="h-4 w-4 mr-1" />
                        <a 
                          href={branch.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {branch.website}
                        </a>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(branch)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleDefault(branch.id, branch.isDefault)}
                      className={`${branch.isDefault ? 'text-yellow-600' : 'text-gray-400'} hover:text-yellow-600`}
                      title={branch.isDefault ? 'Remove as default' : 'Set as default'}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {editingBranch ? 'Edit Branch' : 'New Branch'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingBranch(null)
                  setFormData({
                    name: '',
                    addressLine1: '',
                    addressLine2: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'Myanmar',
                    phone: '',
                    fax: '',
                    website: '',
                    defaultTransactionSeries: '',
                    isDefault: false
                  })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Branch Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Transaction Series
                  </label>
                  <input
                    type="text"
                    value={formData.defaultTransactionSeries}
                    onChange={(e) => setFormData({...formData, defaultTransactionSeries: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Default Transaction Series"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({...formData, addressLine1: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  placeholder="Street 1"
                />
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({...formData, addressLine2: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Street 2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City"
                />
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ZIP/Postal Code"
                />
              </div>

              <div>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Myanmar">Myanmar</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="Cambodia">Cambodia</option>
                  <option value="Laos">Laos</option>
                  <option value="Brunei">Brunei</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="State/Province"
                />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Phone"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={formData.fax}
                  onChange={(e) => setFormData({...formData, fax: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Fax Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Website URL"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                  Set as default branch
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingBranch(null)
                    setFormData({
                      name: '',
                      addressLine1: '',
                      addressLine2: '',
                      city: '',
                      state: '',
                      postalCode: '',
                      country: 'Myanmar',
                      phone: '',
                      fax: '',
                      website: '',
                      defaultTransactionSeries: '',
                      isDefault: false
                    })
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingBranch ? 'Update' : 'Create'} Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
