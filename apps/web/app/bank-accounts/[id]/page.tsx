'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  CreditCard, 
  PiggyBank, 
  Wallet, 
  Banknote, 
  Shield,
  Edit,
  ArrowLeft,
  DollarSign,
  Hash,
  MapPin,
  FileText,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  Filter,
  Download
} from 'lucide-react'

type BankTransaction = {
  id: string
  transactionDate: string
  transactionType: string
  amount: string
  runningBalance: string
  description: string
  reference: string
  category: string
  counterparty: string
  status: string
  invoices?: {
    invoiceNumber: string
    customers: {
      name: string
    }
  }
  journals?: {
    journalNumber: string
  }
}

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
  createdAt: string
  updatedAt: string
  ledger_accounts?: {
    id: string
    name: string
    code: string
    type: string
    description?: string
  }
}

type Summary = {
  currentBalance: number
  totalDeposits30Days: number
  totalWithdrawals30Days: number
  transactionCount30Days: number
}

export default function BankAccountDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  useEffect(() => {
    if (!params.id) return

    const loadBankAccount = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
        
        if (!token) {
          setError('No authentication token found. Please log in again.')
          console.error('No authentication token found')
          return
        }
        
        // Load bank account summary
        const summaryRes = await fetch(`/api/bank-accounts/${params.id}/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!summaryRes.ok) {
          const errorText = await summaryRes.text()
          setError(`Failed to load bank account: ${summaryRes.status} ${summaryRes.statusText}`)
          console.error('Summary request failed:', summaryRes.status, summaryRes.statusText)
          console.error('Error response:', errorText)
          return
        }
        
        const summaryData = await summaryRes.json()
        if (summaryData.success) {
          setBankAccount(summaryData.data.bankAccount)
          setSummary(summaryData.data.summary)
        } else {
          console.error('Summary API error:', summaryData.error)
          return
        }

        // Load transactions
        const transRes = await fetch(`/api/bank-accounts/${params.id}/transactions?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!transRes.ok) {
          console.error('Transactions request failed:', transRes.status, transRes.statusText)
          const errorText = await transRes.text()
          console.error('Error response:', errorText)
          return
        }
        
        const transData = await transRes.json()
        if (transData.success) {
          setTransactions(transData.data)
        } else {
          console.error('Transactions API error:', transData.error)
        }
      } catch (error) {
        console.error('Failed to load bank account:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBankAccount()
  }, [params.id])

  const getAccountTypeIcon = (accountType: string) => {
    switch (accountType?.toLowerCase()) {
      case 'savings': return PiggyBank
      case 'checking': return CreditCard
      case 'business': return Building2
      case 'investment': return TrendingUp
      default: return Wallet
    }
  }

  const getCurrencySymbol = (currencyCode: string) => {
    switch (currencyCode) {
      case 'MMK': return 'K'
      case 'USD': return '$'
      case 'SGD': return 'S$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      default: return currencyCode
    }
  }

  const formatCurrency = (amount: string | number) => {
    const numAmount = parseFloat(amount.toString()) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0,
    }).format(numAmount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionTypeColor = (type: string) => {
    return type === 'credit' ? 'text-green-600' : 'text-red-600'
  }

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? TrendingUp : TrendingDown
  }

  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 10)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bank account details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Banknote className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Bank Account</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => router.push('/bank-accounts')} variant="outline">
              Back to Bank Accounts
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!bankAccount) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Banknote className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Bank Account Not Found</h2>
          <p className="text-gray-600 mb-6">The bank account you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/bank-accounts')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bank Accounts
          </Button>
        </div>
      </div>
    )
  }

  const Icon = getAccountTypeIcon(bankAccount.accountType)

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/bank-accounts')}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bank Accounts
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Icon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {bankAccount.bankName} - {bankAccount.accountName}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-600">****{bankAccount.accountNumber.slice(-4)}</p>
                <Badge variant={bankAccount.isActive ? 'default' : 'secondary'}>
                  {bankAccount.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {bankAccount.isPrimary && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    Primary Account
                  </Badge>
                )}
              </div>
              {bankAccount.ledger_accounts && (
                <p className="text-sm text-blue-600 mt-1">
                  📊 Chart of Accounts: {bankAccount.ledger_accounts.code} - {bankAccount.ledger_accounts.name}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Current Balance</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(bankAccount.currentBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Current Balance</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.currentBalance)}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Deposits (30 days)</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalDeposits30Days)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Withdrawals (30 days)</p>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(summary.totalWithdrawals30Days)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Transactions (30 days)</p>
                  <p className="text-2xl font-bold text-purple-900">{summary.transactionCount30Days}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Account Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Information */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-blue-600" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Number</label>
                  <p className="text-gray-900 font-medium">****{bankAccount.accountNumber.slice(-4)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Currency</label>
                  <p className="text-gray-900 font-medium">{bankAccount.currency}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Type</label>
                  <p className="text-gray-900 font-medium capitalize">{bankAccount.accountType}</p>
                </div>
                {bankAccount.routingNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Routing Number</label>
                    <p className="text-gray-900 font-medium">{bankAccount.routingNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bank Information */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                Bank Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Bank Name</label>
                <p className="text-gray-900 font-medium">{bankAccount.bankName}</p>
              </div>
              {bankAccount.branch && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Branch</label>
                  <p className="text-gray-900 font-medium">{bankAccount.branch}</p>
                </div>
              )}
              {bankAccount.swiftCode && (
                <div>
                  <label className="text-sm font-medium text-gray-500">SWIFT Code</label>
                  <p className="text-gray-900 font-medium">{bankAccount.swiftCode}</p>
                </div>
              )}
              {bankAccount.iban && (
                <div>
                  <label className="text-sm font-medium text-gray-500">IBAN</label>
                  <p className="text-gray-900 font-medium">{bankAccount.iban}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account History */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Account History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900 font-medium">{formatDateTime(bankAccount.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900 font-medium">{formatDateTime(bankAccount.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Button variant="outline" onClick={() => router.push(`/bank-accounts/${bankAccount.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Account
                </Button>
                <Button variant="outline" onClick={() => router.push('/accounts')}>
                  <Activity className="h-4 w-4 mr-2" />
                  View Chart of Accounts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    Transaction History
                  </CardTitle>
                  <CardDescription>Recent banking transactions for this account</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
                  <p className="text-gray-500 mb-6">
                    When you record payments or transactions, they'll appear here with full details.
                  </p>
                  <Button onClick={() => router.push('/invoices/new')}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-4 px-6 font-medium text-gray-900">Date</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-900">Description</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-900">Reference</th>
                        <th className="text-center py-4 px-6 font-medium text-gray-900">Type</th>
                        <th className="text-right py-4 px-6 font-medium text-gray-900">Amount</th>
                        <th className="text-right py-4 px-6 font-medium text-gray-900">Balance</th>
                        <th className="text-center py-4 px-6 font-medium text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedTransactions.map((transaction, index) => {
                        const Icon = getTransactionIcon(transaction.transactionType)
                        return (
                          <tr key={transaction.id} className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                            <td className="py-4 px-6">
                              <div className="font-medium text-gray-900">{formatDate(transaction.transactionDate)}</div>
                              <div className="text-sm text-gray-500">{new Date(transaction.transactionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-medium text-gray-900">{transaction.description}</div>
                              {transaction.counterparty && (
                                <div className="text-sm text-gray-600">{transaction.counterparty}</div>
                              )}
                              {transaction.invoices && (
                                <div className="text-sm text-blue-600 mt-1">
                                  <FileText className="h-3 w-3 inline mr-1" />
                                  Invoice: {transaction.invoices.invoiceNumber}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm text-gray-700">{transaction.reference}</div>
                              {transaction.journals && (
                                <div className="text-xs text-gray-500 mt-1">Journal: {transaction.journals.journalNumber}</div>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Icon className={`h-4 w-4 ${getTransactionTypeColor(transaction.transactionType)}`} />
                                <span className={`capitalize font-medium ${getTransactionTypeColor(transaction.transactionType)}`}>
                                  {transaction.transactionType}
                                </span>
                              </div>
                            </td>
                            <td className={`py-4 px-6 text-right font-bold ${getTransactionTypeColor(transaction.transactionType)}`}>
                              {transaction.transactionType === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </td>
                            <td className="py-4 px-6 text-right font-medium text-gray-900">
                              {formatCurrency(transaction.runningBalance)}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                                {transaction.status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  
                  {transactions.length > 10 && (
                    <div className="border-t bg-gray-50 p-4 text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAllTransactions(!showAllTransactions)}
                        className="w-full sm:w-auto"
                      >
                        {showAllTransactions ? 'Show Less' : `Show All ${transactions.length} Transactions`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}