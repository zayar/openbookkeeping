'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, MoreHorizontal, Search, Filter, 
  Edit, Trash2, Eye, Receipt
} from 'lucide-react'
import Link from 'next/link'

interface Tax {
  id: string
  name: string
  rate: number
  type: string
  isCompound: boolean
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function TaxesPage() {
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    loadTaxes()
  }, [])

  const loadTaxes = async () => {
    try {
      console.log('Loading taxes...')
      const response = await fetch('/api/taxes')
      const data = await response.json()
      console.log('Taxes response:', data)
      
      if (data.success) {
        setTaxes(data.data)
        console.log('Taxes loaded:', data.data)
      } else {
        console.error('Failed to load taxes:', data.error)
      }
    } catch (error) {
      console.error('Error loading taxes:', error)
    } finally {
      setLoading(false)
      console.log('Loading finished')
    }
  }

  const handleDeleteTax = async (taxId: string) => {
    if (!confirm('Are you sure you want to delete this tax?')) return
    
    try {
      const response = await fetch(`/api/taxes/${taxId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setTaxes(taxes.filter(tax => tax.id !== taxId))
        alert('Tax deleted successfully')
      } else {
        const error = await response.json()
        alert(`Failed to delete tax: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting tax:', error)
      alert('Failed to delete tax')
    }
  }

  const filteredTaxes = taxes.filter(tax => {
    const matchesSearch = tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tax.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || tax.type === filterType
    return matchesSearch && matchesType
  })

  const getTaxTypeColor = (type: string) => {
    switch (type) {
      case 'vat': return 'bg-blue-100 text-blue-800'
      case 'income': return 'bg-green-100 text-green-800'
      case 'gst': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  console.log('Rendering TaxesPage, loading:', loading, 'taxes:', taxes)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading taxes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Taxes</h1>
              <p className="text-gray-600">Manage your tax rates and settings</p>
            </div>
            <div className="flex space-x-3">
              <Link href="/taxes/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Tax
                </Button>
              </Link>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                More
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search taxes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="vat">VAT</option>
              <option value="income">Income Tax</option>
              <option value="gst">GST</option>
              <option value="standard">Standard</option>
            </select>
          </div>
        </div>

        {/* Tax List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Active Taxes ({filteredTaxes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTaxes.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No taxes found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first tax rate'
                  }
                </p>
                {!searchTerm && filterType === 'all' && (
                  <Link href="/taxes/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Tax
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">TAX NAME</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">RATE (%)</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">TYPE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">STATUS</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTaxes.map((tax) => (
                      <tr key={tax.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{tax.name}</div>
                            {tax.description && (
                              <div className="text-sm text-gray-500">{tax.description}</div>
                            )}
                            {tax.isCompound && (
                              <div className="mt-1 text-xs border border-gray-300 rounded-full px-2 py-1 text-gray-700 bg-white">
                                Compound Tax
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-gray-900">{tax.rate}%</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getTaxTypeColor(tax.type)}`}>
                            {tax.type.toUpperCase()}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tax.isActive ? 'border-transparent bg-blue-600 text-white' : 'border-transparent bg-gray-100 text-gray-800'}`}>
                            {tax.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex space-x-2">
                            <Link href={`/taxes/${tax.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/taxes/${tax.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTax(tax.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
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
      </main>
    </div>
  )
}
