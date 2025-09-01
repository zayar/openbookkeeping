'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'

type BankAccount = { 
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  accountType: string
  currentBalance: string
  currency: string
  isActive: boolean
  isPrimary: boolean
  branch?: string
  swiftCode?: string
  description?: string
  ledgerAccount?: { name: string; code: string }
}

export default function BankAccountsPage() {
  const { token } = useAuth()
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [chartBankAccounts, setChartBankAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!token) return
      
      try {
        // Load dedicated bank accounts
        const bankRes = await fetch(`/api/bank-accounts`, { headers: { Authorization: `Bearer ${token}` } })
        const bankData = await bankRes.json()
        if (bankData.success) setBankAccounts(bankData.data)
        
        // Load bank-type accounts from Chart of Accounts
        const accountsRes = await fetch(`/api/accounts`, { headers: { Authorization: `Bearer ${token}` } })
        const accountsData = await accountsRes.json()
        if (accountsData.success) {
          const bankTypeAccounts = accountsData.data.filter((acc: any) => acc.type === 'bank')
          setChartBankAccounts(bankTypeAccounts)
        }
      } catch (error) {
        console.error('Failed to load bank accounts:', error)
      } finally { 
        setLoading(false) 
      }
    }
    
    if (token) {
      load()
    } else {
      setLoading(false)
    }
  }, [token])

  if (!token) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <p>Please log in to view bank accounts.</p>
        <Link href="/login">
          <Button className="mt-4">Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bank Accounts</h1>
        <Link href="/bank-accounts/new"><Button>Add Bank Account</Button></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Your Bank Accounts</CardTitle></CardHeader>
        <CardContent>
          {loading ? 'Loading...' : (
            <div className="divide-y">
              {/* Dedicated Bank Accounts */}
              {bankAccounts.map(acc => (
                <div key={`bank-${acc.id}`} className="flex items-center justify-between py-6 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold text-lg">{acc.bankName} - {acc.accountName}</div>
                      {acc.isPrimary && (
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          Primary
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        Full Setup
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-4">
                        <span>****{acc.accountNumber.slice(-4)}</span>
                        <span className="capitalize">{acc.accountType.replace('_', ' ')}</span>
                        <span>{acc.currency}</span>
                        {acc.branch && <span>Branch: {acc.branch}</span>}
                      </div>
                      {acc.ledgerAccount && (
                        <div className="text-blue-600">
                          📊 Chart of Accounts: {acc.ledgerAccount.code} - {acc.ledgerAccount.name}
                        </div>
                      )}
                      {acc.description && (
                        <div className="text-gray-500 italic">{acc.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {acc.currency === 'MMK' ? 'K' : acc.currency === 'USD' ? '$' : acc.currency === 'SGD' ? 'S$' : acc.currency}
                        {parseFloat(acc.currentBalance).toLocaleString()}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={acc.isActive ? 'default' : 'secondary'}>
                          {acc.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {acc.swiftCode && (
                          <Badge variant="outline" className="text-xs">
                            SWIFT: {acc.swiftCode}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Link href={`/bank-accounts/${acc.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/bank-accounts/${acc.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Bank Accounts from Chart of Accounts */}
              {chartBankAccounts.map(acc => (
                <div key={`chart-${acc.id}`} className="flex items-center justify-between py-6 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold text-lg">{acc.code} - {acc.name}</div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                        Chart of Accounts
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="capitalize">{acc.type.replace('_', ' ')}</span>
                        <span>Bank Account</span>
                      </div>
                      <div className="text-orange-600">
                        📊 From Chart of Accounts - Set up full banking details for complete functionality
                      </div>
                      {acc.description && (
                        <div className="text-gray-500 italic">{acc.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Accounting Only
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Link href={`/accounts/${acc.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/accounts/${acc.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button 
                        size="sm" 
                        onClick={() => window.location.href = `/bank-accounts/new?ledgerAccountId=${acc.id}`}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Setup Banking
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {bankAccounts.length === 0 && chartBankAccounts.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No bank accounts found. <Link href="/bank-accounts/new" className="text-blue-600 hover:underline">Add your first bank account</Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
