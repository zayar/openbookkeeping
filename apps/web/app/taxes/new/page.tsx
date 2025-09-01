'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Info, Save, X } from 'lucide-react'
import Link from 'next/link'

export default function NewTaxPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    type: 'standard',
    isCompound: false,
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.rate) {
      alert('Tax name and rate are required')
      return
    }

    const rate = parseFloat(formData.rate)
    if (isNaN(rate) || rate < 0) {
      alert('Tax rate must be a valid positive number')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/taxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          rate: rate
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Tax created successfully!')
        router.push('/taxes')
      } else {
        alert(`Failed to create tax: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating tax:', error)
      alert('Failed to create tax')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/taxes" className="mr-4">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Tax</h1>
              <p className="text-gray-600">Create a new tax rate</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tax Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Tax Name*
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter tax name"
                  className="mt-1"
                  required
                />
              </div>

              {/* Tax Rate */}
              <div>
                <Label htmlFor="rate" className="text-sm font-medium text-gray-700">
                  Rate (%)*
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) => handleInputChange('rate', e.target.value)}
                    placeholder="0.00"
                    className="pr-12"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>

              {/* Tax Type */}
              <div>
                <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                  Tax Type
                </Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="vat">VAT</option>
                  <option value="gst">GST</option>
                  <option value="income">Income Tax</option>
                  <option value="sales">Sales Tax</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Compound Tax */}
              <div className="flex items-start space-x-3">
                <input
                  id="isCompound"
                  type="checkbox"
                  checked={formData.isCompound}
                  onChange={(e) => handleInputChange('isCompound', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <Label htmlFor="isCompound" className="text-sm font-medium text-gray-700">
                    This tax is a compound tax
                  </Label>
                  <div className="flex items-center mt-1">
                    <Info className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">
                      Compound taxes are calculated on top of other taxes
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description for this tax"
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Link href="/taxes">
                  <Button type="button" variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Tax
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
