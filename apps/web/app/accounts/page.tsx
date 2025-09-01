'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/providers/auth-provider'

type Account = { id:string; code:string; name:string; type:string }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const { token, user } = useAuth()

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/accounts`, { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        })
        const data = await res.json()
        if (data.success) setAccounts(data.data)
      } catch (error) {
        console.error('Failed to load accounts:', error)
      } finally { 
        setLoading(false) 
      }
    }
    load()
  }, [token])

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <p>Please log in to view accounts.</p>
        <Link href="/login">
          <Button className="mt-4">Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
        <Link href="/accounts/new"><Button>New Account</Button></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Accounts</CardTitle></CardHeader>
        <CardContent>
          {loading ? 'Loading...' : (
            <div className="divide-y">
              {accounts.map(a => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{a.code} · {a.name}</div>
                    <div className="text-xs text-gray-500">{a.type}</div>
                  </div>
                  <div className="space-x-2">
                    <Link href={`/accounts/${a.id}`}><Button variant="outline">View</Button></Link>
                    <Link href={`/accounts/${a.id}/edit`}><Button variant="outline">Edit</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


