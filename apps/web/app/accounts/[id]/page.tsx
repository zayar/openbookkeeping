'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [acc, setAcc] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      const res = await fetch(`/api/accounts/${params?.id}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      const data = await res.json()
      if (data.success) setAcc(data.data)
    }
    if (params?.id) load()
  }, [params?.id])

  if (!acc) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{acc.code} · {acc.name}</h1>
        <Button variant="outline" onClick={()=>router.push(`/accounts/${acc.id}/edit`)}>Edit</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Type</span><div>{acc.type}</div></div>
            <div><span className="text-gray-500">Active</span><div>{acc.isActive ? 'Yes' : 'No'}</div></div>
            <div className="col-span-2"><span className="text-gray-500">Description</span><div>{acc.description || '-'}</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


