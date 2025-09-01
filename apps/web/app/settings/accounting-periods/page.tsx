'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Lock, Unlock, RotateCcw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface AccountingPeriod {
  id: string
  organization_id: string
  fiscal_year: number
  period_number: number
  period_name: string
  start_date: string
  end_date: string
  status: 'open' | 'soft_closed' | 'closed'
  closed_at?: string
  closed_by?: string
  reopened_at?: string
  reopened_by?: string
  created_at: string
  updated_at: string
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'open':
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Open
      </Badge>
    case 'soft_closed':
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Soft Closed
      </Badge>
    case 'closed':
      return <Badge variant="default" className="bg-red-100 text-red-800 border-red-200">
        <Lock className="h-3 w-3 mr-1" />
        Closed
      </Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function AccountingPeriodsPage() {
  const { token } = useAuth()
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (token) {
      loadPeriods()
    }
  }, [token])

  const loadPeriods = async () => {
    try {
      const response = await fetch('/api/settings/accounting-periods', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (data.success) {
        setPeriods(data.data)
      } else {
        setError(data.error || 'Failed to load accounting periods')
      }
    } catch (error) {
      console.error('Failed to load periods:', error)
      setError('Failed to load accounting periods')
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodAction = async (periodId: string, action: 'close' | 'soft_close' | 'reopen') => {
    setActionLoading(periodId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/settings/accounting-periods/${periodId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Period ${action.replace('_', ' ')}d successfully!`)
        loadPeriods() // Reload periods
      } else {
        setError(data.error || `Failed to ${action} period`)
      }
    } catch (error) {
      console.error(`${action} period error:`, error)
      setError(`Failed to ${action} period`)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const groupedPeriods = periods.reduce((acc, period) => {
    if (!acc[period.fiscal_year]) {
      acc[period.fiscal_year] = []
    }
    acc[period.fiscal_year].push(period)
    return acc
  }, {} as Record<number, AccountingPeriod[]>)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Accounting Periods
        </h1>
        <p className="text-gray-600 mt-1">Manage your fiscal year periods and control when transactions can be posted</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {periods.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounting Periods Found</h3>
            <p className="text-gray-600 mb-4">
              You need to generate accounting periods before you can create transactions.
            </p>
            <p className="text-sm text-gray-500">
              Go to <strong>Settings → Organization</strong> to configure your fiscal year and generate periods.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPeriods)
            .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Sort by fiscal year descending
            .map(([fiscalYear, yearPeriods]) => (
              <Card key={fiscalYear}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Fiscal Year {fiscalYear}</span>
                    <Badge variant="outline" className="text-sm">
                      {yearPeriods.length} periods
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Period</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Start Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">End Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearPeriods
                          .sort((a, b) => a.period_number - b.period_number)
                          .map((period) => (
                            <tr key={period.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">{period.period_name}</div>
                                <div className="text-sm text-gray-500">Period {period.period_number}</div>
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {formatDate(period.start_date)}
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {formatDate(period.end_date)}
                              </td>
                              <td className="py-3 px-4">
                                {getStatusBadge(period.status)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {period.status === 'open' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePeriodAction(period.id, 'soft_close')}
                                        disabled={actionLoading === period.id}
                                        className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        Soft Close
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePeriodAction(period.id, 'close')}
                                        disabled={actionLoading === period.id}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                      >
                                        <Lock className="h-3 w-3 mr-1" />
                                        Close
                                      </Button>
                                    </>
                                  )}
                                  {(period.status === 'soft_closed' || period.status === 'closed') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePeriodAction(period.id, 'reopen')}
                                      disabled={actionLoading === period.id}
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                      <Unlock className="h-3 w-3 mr-1" />
                                      Reopen
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Period Status Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-green-800">Open</div>
                <div className="text-gray-600">All transactions can be posted</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-800">Soft Closed</div>
                <div className="text-gray-600">New transactions blocked, edits via reversal only</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <div className="font-medium text-red-800">Closed</div>
                <div className="text-gray-600">No changes allowed, period is locked</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
