'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Vendor = { 
  id: string
  name: string
  email?: string
  phone?: string
  vendorType: string
  paymentTerms: string
  isActive: boolean
  createdAt: string
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
        const res = await fetch(`/api/vendors`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        const data = await res.json()
        if (data.success) setVendors(data.data)
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const getVendorTypeColor = (type: string) => {
    switch (type) {
      case 'supplier': return 'default'
      case 'contractor': return 'secondary'
      case 'service': return 'outline'
      default: return 'default'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vendors & Suppliers</h1>
        <Link href="/vendors/new"><Button>Add Vendor</Button></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Your Vendors</CardTitle></CardHeader>
        <CardContent>
          {loading ? 'Loading...' : (
            <div className="divide-y">
              {vendors.map(vendor => (
                <div key={vendor.id} className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <div className="font-medium">{vendor.name}</div>
                    <div className="text-sm text-gray-500">
                      {vendor.email && <span>{vendor.email}</span>}
                      {vendor.phone && <span> • {vendor.phone}</span>}
                      <span> • {vendor.paymentTerms}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getVendorTypeColor(vendor.vendorType)}>{vendor.vendorType}</Badge>
                      <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="space-x-2">
                      <Link href={`/vendors/${vendor.id}`}><Button variant="outline" size="sm">View</Button></Link>
                      <Link href={`/vendors/${vendor.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>
                    </div>
                  </div>
                </div>
              ))}
              {vendors.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No vendors found. <Link href="/vendors/new" className="text-blue-600 hover:underline">Add your first vendor</Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
