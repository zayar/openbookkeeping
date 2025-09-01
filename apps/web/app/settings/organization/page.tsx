'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building, Calendar, Globe, DollarSign, Clock, Save, RefreshCw } from 'lucide-react'

interface OrganizationProfile {
  id?: string
  organization_id: string
  fiscal_year_start_month: number
  fiscal_year_start_day: number
  report_basis: string
  base_currency: string
  timezone: string
  date_format: string
  allow_negative_inventory: boolean
  auto_close_periods: boolean
  retained_earnings_account_id?: string
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
]

const CURRENCIES = [
  { code: 'MMK', name: 'Myanmar Kyat' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' }
]

const TIMEZONES = [
  { value: 'Asia/Yangon', label: 'Asia/Yangon (Myanmar)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'Europe/London', label: 'Europe/London' }
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
]

export default function OrganizationSettingsPage() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<OrganizationProfile>({
    organization_id: '',
    fiscal_year_start_month: 1,
    fiscal_year_start_day: 1,
    report_basis: 'accrual',
    base_currency: 'MMK',
    timezone: 'Asia/Yangon',
    date_format: 'DD/MM/YYYY',
    allow_negative_inventory: false,
    auto_close_periods: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (token) {
      loadProfile()
    }
  }, [token])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/settings/organization-profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (data.success && data.data) {
        setProfile(data.data)
      }
    } catch (error) {
      console.error('Failed to load organization profile:', error)
      setError('Failed to load organization settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/settings/organization-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Organization settings saved successfully!')
        setProfile(data.data)
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Save error:', error)
      setError('Failed to save organization settings')
    } finally {
      setSaving(false)
    }
  }

  const handleGeneratePeriods = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/settings/generate-periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fiscal_year_start_month: profile.fiscal_year_start_month,
          fiscal_year_start_day: profile.fiscal_year_start_day
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Generated ${data.periodsCreated} accounting periods successfully!`)
      } else {
        setError(data.error || 'Failed to generate periods')
      }
    } catch (error) {
      console.error('Generate periods error:', error)
      setError('Failed to generate accounting periods')
    } finally {
      setGenerating(false)
    }
  }

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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building className="h-6 w-6" />
          Organization Settings
        </h1>
        <p className="text-gray-600 mt-1">Configure your organization's fiscal year, currency, and accounting preferences</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fiscal Year Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fiscal Year
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fiscal-month">Fiscal Year Start Month</Label>
              <Select
                value={profile.fiscal_year_start_month.toString()}
                onValueChange={(value) => setProfile({...profile, fiscal_year_start_month: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fiscal-day">Fiscal Year Start Day</Label>
              <Input
                id="fiscal-day"
                type="number"
                min="1"
                max="31"
                value={profile.fiscal_year_start_day}
                onChange={(e) => setProfile({...profile, fiscal_year_start_day: parseInt(e.target.value) || 1})}
              />
            </div>

            <div>
              <Label htmlFor="report-basis">Report Basis</Label>
              <Select
                value={profile.report_basis}
                onValueChange={(value) => setProfile({...profile, report_basis: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accrual">Accrual</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Currency & Localization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Currency & Localization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="base-currency">Base Currency</Label>
              <Select
                value={profile.base_currency}
                onValueChange={(value) => setProfile({...profile, base_currency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={profile.timezone}
                onValueChange={(value) => setProfile({...profile, timezone: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-format">Date Format</Label>
              <Select
                value={profile.date_format}
                onValueChange={(value) => setProfile({...profile, date_format: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Inventory Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allow-negative"
                checked={profile.allow_negative_inventory}
                onChange={(e) => setProfile({...profile, allow_negative_inventory: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="allow-negative">Allow Negative Inventory</Label>
            </div>
          </CardContent>
        </Card>

        {/* Period Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Period Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-close"
                checked={profile.auto_close_periods}
                onChange={(e) => setProfile({...profile, auto_close_periods: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="auto-close">Auto Close Periods</Label>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleGeneratePeriods}
                disabled={generating}
                className="w-full"
                variant="outline"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Periods...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Generate Accounting Periods
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                This will create accounting periods for the current and next fiscal year based on your settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-32">
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
