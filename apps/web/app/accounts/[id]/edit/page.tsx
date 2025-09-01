'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Detailed account types organized by category
const ACCOUNT_TYPES = [
  // Asset types
  { value: 'other_asset', label: 'Asset - Other Asset' },
  { value: 'other_current_asset', label: 'Asset - Other Current Asset' },
  { value: 'cash', label: 'Asset - Cash' },
  { value: 'bank', label: 'Asset - Bank' },
  { value: 'fixed_asset', label: 'Asset - Fixed Asset' },
  { value: 'accounts_receivable', label: 'Asset - Accounts Receivable' },
  { value: 'stock', label: 'Asset - Stock' },
  { value: 'payment_clearing_account', label: 'Asset - Payment Clearing Account' },
  { value: 'input_tax', label: 'Asset - Input Tax' },
  { value: 'intangible_asset', label: 'Asset - Intangible Asset' },
  { value: 'non_current_asset', label: 'Asset - Non Current Asset' },
  { value: 'deferred_tax_asset', label: 'Asset - Deferred Tax Asset' },
  
  // Liability types
  { value: 'other_current_liability', label: 'Liability - Other Current Liability' },
  { value: 'credit_card', label: 'Liability - Credit Card' },
  { value: 'non_current_liability', label: 'Liability - Non Current Liability' },
  { value: 'other_liability', label: 'Liability - Other Liability' },
  { value: 'accounts_payable', label: 'Liability - Accounts Payable' },
  { value: 'overseas_tax_payable', label: 'Liability - Overseas Tax Payable' },
  { value: 'output_tax', label: 'Liability - Output Tax' },
  { value: 'deferred_tax_liability', label: 'Liability - Deferred Tax Liability' },
  
  // Equity types
  { value: 'equity', label: 'Equity - Equity' },
  
  // Income types
  { value: 'income', label: 'Income - Income' },
  { value: 'other_income', label: 'Income - Other Income' },
  
  // Expense types
  { value: 'expense', label: 'Expense - Expense' },
  { value: 'cost_of_goods_sold', label: 'Expense - Cost Of Goods Sold' },
  { value: 'other_expense', label: 'Expense - Other Expense' }
]

export default function EditAccountPage() {
  const params = useParams()
  const router = useRouter()
  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      const res = await fetch(`/api/accounts/${params?.id}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      const data = await res.json()
      if (data.success) setForm({
        code: data.data.code,
        name: data.data.name,
        type: data.data.type,
        description: data.data.description || '',
        isActive: data.data.isActive
      })
    }
    if (params?.id) load()
  }, [params?.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      const res = await fetch(`/api/accounts/${params?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) router.push(`/accounts/${params?.id}`)
      else setError(data.error || 'Failed to save account')
    } catch (e:any) { setError(e.message || 'Failed to save account') }
    finally { setSaving(false) }
  }

  if (!form) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader><CardTitle>Edit Account</CardTitle></CardHeader>
        <CardContent>
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={e=>setForm({...form, code:e.target.value})} required />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
            </div>
            <div>
              <Label>Type</Label>
              <select className="h-10 w-full rounded-md border px-3" value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
                {ACCOUNT_TYPES.map(t=> <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form, isActive:e.target.checked})} />
                Active
              </label>
            </div>
            <div className="col-span-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


