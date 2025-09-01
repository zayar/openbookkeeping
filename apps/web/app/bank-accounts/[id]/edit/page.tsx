'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  CreditCard, 
  PiggyBank, 
  Wallet, 
  Banknote, 
  Shield,
  Save,
  ArrowLeft,
  AlertCircle,
  Info
} from 'lucide-react'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking Account', icon: Wallet, description: 'Daily transactions and payments' },
  { value: 'savings', label: 'Savings Account', icon: PiggyBank, description: 'Save money and earn interest' },
  { value: 'credit', label: 'Credit Card', icon: CreditCard, description: 'Credit line for purchases' },
  { value: 'line_of_credit', label: 'Line of Credit', icon: Banknote, description: 'Flexible borrowing facility' }
]

const CURRENCIES = [
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' }
]

type BankAccount = {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  routingNumber?: string
  accountType: string
  currentBalance: string
  currency: string
  isActive: boolean
  isPrimary: boolean
  branch?: string
  swiftCode?: string
  iban?: string
  description?: string
}

export default function EditBankAccountPage() {
  const router = useRouter()
  const params = useParams()
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [form, setForm] = useState({ 
    bankName: '', 
    accountName: '', 
    accountNumber: '', 
    routingNumber: '', 
    accountType: 'checking', 
    currency: 'MMK',
    currentBalance: '0',
    description: '',
    isPrimary: false,
    branch: '',
    swiftCode: '',
    iban: '',
    isActive: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadBankAccount = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
        const res = await fetch(`/api/bank-accounts/${params.id}`, { 
          headers: { Authorization: token ? `Bearer ${token}` : '' } 
        })
        const data = await res.json()
        if (data.success) {
          setBankAccount(data.data)
          setForm({
            bankName: data.data.bankName,
            accountName: data.data.accountName,
            accountNumber: data.data.accountNumber,
            routingNumber: data.data.routingNumber || '',
            accountType: data.data.accountType,
            currency: data.data.currency,
            currentBalance: data.data.currentBalance,
            description: data.data.description || '',
            isPrimary: data.data.isPrimary,
            branch: data.data.branch || '',
            swiftCode: data.data.swiftCode || '',
            iban: data.data.iban || '',
            isActive: data.data.isActive
          })
        } else {
          setError(data.error || 'Failed to load bank account')
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load bank account')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadBankAccount()
    }
  }, [params.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      
      const res = await fetch(`/api/bank-accounts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({
          ...form,
          currentBalance: parseFloat(form.currentBalance) || 0
        })
      })
      
      const data = await res.json()
      if (data.success) {
        setSuccess('Bank account updated successfully!')
        setTimeout(() => router.push(`/bank-accounts/${params.id}`), 1500)
      } else {
        setError(data.error || 'Failed to update bank account')
      }
    } catch (e: any) { 
      setError(e.message || 'Failed to update bank account') 
    } finally { 
      setSaving(false) 
    }
  }

  const getAccountTypeIcon = (type: string) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === type)
    return accountType ? accountType.icon : Wallet
  }

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode)
    return currency ? currency.symbol : currencyCode
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bank account...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !bankAccount) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Shield className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Bank Account</h2>
          <p className="text-gray-600 mb-6">{error || 'Bank account not found'}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Bank Account</h1>
          <p className="text-gray-600 mt-2">Update your bank account information</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      {/* Main Form */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Building2 className="h-6 w-6 text-blue-600" />
            Edit Bank Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-6">
            {/* Account Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Account Type *</Label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {ACCOUNT_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = form.accountType === type.value
                  return (
                    <div
                      key={type.value}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setForm({...form, accountType: type.value})}
                    >
                      <div className="flex flex-col items-center text-center space-y-2">
                        <Icon className={`h-8 w-8 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                        <div>
                          <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {type.label}
                          </div>
                          <div className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bankName" className="text-sm font-medium text-gray-700">
                  Bank Name *
                </Label>
                <Input
                  id="bankName"
                  value={form.bankName}
                  onChange={e => setForm({...form, bankName: e.target.value})}
                  placeholder="Enter bank name"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName" className="text-sm font-medium text-gray-700">
                  Account Name *
                </Label>
                <Input
                  id="accountName"
                  value={form.accountName}
                  onChange={e => setForm({...form, accountName: e.target.value})}
                  placeholder="Enter account name"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber" className="text-sm font-medium text-gray-700">
                  Account Number *
                </Label>
                <Input
                  id="accountNumber"
                  value={form.accountNumber}
                  onChange={e => setForm({...form, accountNumber: e.target.value})}
                  placeholder="Enter account number"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="routingNumber" className="text-sm font-medium text-gray-700">
                  Routing Number
                </Label>
                <Input
                  id="routingNumber"
                  value={form.routingNumber}
                  onChange={e => setForm({...form, routingNumber: e.target.value})}
                  placeholder="Enter routing number"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                  Currency *
                </Label>
                <select 
                  className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.currency} 
                  onChange={(e) => setForm({...form, currency: e.target.value})}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol}) - {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentBalance" className="text-sm font-medium text-gray-700">
                  Current Balance
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {getCurrencySymbol(form.currency)}
                  </span>
                  <Input
                    id="currentBalance"
                    type="number"
                    step="0.01"
                    value={form.currentBalance}
                    onChange={e => setForm({...form, currentBalance: e.target.value})}
                    placeholder="0.00"
                    className="h-11 pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="branch" className="text-sm font-medium text-gray-700">
                  Branch
                </Label>
                <Input
                  id="branch"
                  value={form.branch}
                  onChange={e => setForm({...form, branch: e.target.value})}
                  placeholder="Enter branch name"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="swiftCode" className="text-sm font-medium text-gray-700">
                  SWIFT Code
                </Label>
                <Input
                  id="swiftCode"
                  value={form.swiftCode}
                  onChange={e => setForm({...form, swiftCode: e.target.value})}
                  placeholder="Enter SWIFT code"
                  className="h-11"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <textarea
                id="description"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Enter additional details about this account..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={form.isPrimary}
                  onChange={(e) => setForm({...form, isPrimary: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="isPrimary" className="text-sm font-medium text-gray-700">
                  Make this the primary bank account
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({...form, isActive: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Account is active
                </Label>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Chart of Accounts Integration</p>
                    <p>Changes to this bank account will automatically update the linked Chart of Accounts entry to maintain consistency.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={saving}
                className="px-8 h-11 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating Account...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Update Bank Account
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
