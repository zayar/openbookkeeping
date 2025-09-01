'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function VendorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [vendor, setVendor] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      const res = await fetch(`/api/vendors/${params?.id}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      const data = await res.json()
      if (data.success) setVendor(data.data)
    }
    if (params?.id) load()
  }, [params?.id])

  if (!vendor) return <div className="p-6">Loading...</div>

  const getVendorTypeColor = (type: string) => {
    switch (type) {
      case 'supplier': return 'default'
      case 'contractor': return 'secondary'
      case 'service': return 'outline'
      default: return 'default'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{vendor.name}</h1>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant={getVendorTypeColor(vendor.vendorType)}>{vendor.vendorType}</Badge>
            <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
              {vendor.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">{vendor.paymentTerms}</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={()=>router.push(`/vendors/${vendor.id}/edit`)}>Edit Vendor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <div>{vendor.email || 'Not provided'}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Phone</span>
              <div>{vendor.phone || 'Not provided'}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Industry</span>
              <div>{vendor.industry || 'Not specified'}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Tax ID</span>
              <div>{vendor.taxId || 'Not provided'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Business Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Payment Terms</span>
              <div>{vendor.paymentTerms}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Vendor Since</span>
              <div>{new Date(vendor.createdAt).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Address</span>
              <div className="whitespace-pre-wrap">{vendor.address || 'No address provided'}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Notes</span>
              <div className="whitespace-pre-wrap">{vendor.notes || 'No notes'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Purchase History</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No purchases yet. <span className="text-blue-600">Create a bill</span> to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
