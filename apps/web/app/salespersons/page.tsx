
'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Edit, MoreHorizontal, User, Mail, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'

interface Salesperson {
  id: string
  name: string
  email: string | null
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export default function SalespersonsPage() {
  const { token } = useAuth()
  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSalesperson, setEditingSalesperson] = useState<Salesperson | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })

  useEffect(() => {
    loadSalespersons()
  }, [])

  const loadSalespersons = async () => {
    try {
      const response = await fetch('/api/salespersons', {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSalespersons(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load salespersons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingSalesperson 
        ? `/api/salespersons/${editingSalesperson.id}`
        : '/api/salespersons'
      
      const method = editingSalesperson ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          organizationId: 'cmefcazyk0003eo15jf5azevc' // TODO: Get from auth context
        })
      })

      if (response.ok) {
        await loadSalespersons()
        setShowModal(false)
        setEditingSalesperson(null)
        setFormData({ name: '', email: '' })
      }
    } catch (error) {
      console.error('Failed to save salesperson:', error)
    }
  }

  const handleEdit = (salesperson: Salesperson) => {
    setEditingSalesperson(salesperson)
    setFormData({
      name: salesperson.name,
      email: salesperson.email || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salesperson?')) return
    
    try {
      const response = await fetch(`/api/salespersons/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      })
      
      if (response.ok) {
        await loadSalespersons()
      }
    } catch (error) {
      console.error('Failed to delete salesperson:', error)
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    
    try {
      const response = await fetch(`/api/salespersons/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        await loadSalespersons()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const filteredSalespersons = salespersons.filter(sp =>
    sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sp.email && sp.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading salespersons...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Salespersons</h1>
          <p className="text-gray-600 mt-2">Manage your sales team and their status</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Search and Actions Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search salesperson..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingSalesperson(null)
                  setFormData({ name: '', email: '' })
                  setShowModal(true)
                }}
                className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Salesperson
              </button>
            </div>
          </div>

          {/* Salespersons Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SALESPERSON NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EMAIL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSalespersons.map((salesperson) => (
                  <tr key={salesperson.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">
                          {salesperson.name}
                        </span>
                        {salesperson.status === 'inactive' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {salesperson.email ? (
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="w-4 h-4 mr-2" />
                          {salesperson.email}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No email</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {salesperson.status === 'active' ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400 mr-2" />
                        )}
                        <span className={`text-sm font-medium ${
                          salesperson.status === 'active' ? 'text-green-800' : 'text-gray-500'
                        }`}>
                          {salesperson.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(salesperson)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(salesperson.id, salesperson.status)}
                          className={`p-1 ${
                            salesperson.status === 'active' 
                              ? 'text-orange-600 hover:text-orange-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {salesperson.status === 'active' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(salesperson.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSalesperson ? 'Edit Salesperson' : 'New Salesperson'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name*
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter salesperson name"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  {editingSalesperson ? 'Update' : 'Save and Select'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
