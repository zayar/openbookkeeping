'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const VENDOR_TYPES = ['supplier', 'contractor', 'service']
const PAYMENT_TERMS = ['net15', 'net30', 'net45', 'net60', 'due_on_receipt']

export default function NewVendorPage() {
  const router = useRouter()
  const [form, setForm] = useState({ 
    name: '', email: '', phone: '', vendorType: 'supplier', 
    industry: '', paymentTerms: 'net30', taxId: '', address: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
      const res = await fetch(`/api/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) router.push(`/vendors/${data.data.id}`)
      else setError(data.error || 'Failed to create vendor')
    } catch (e: any) { setError(e.message || 'Failed to create vendor') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader><CardTitle>Add Vendor</CardTitle></CardHeader>
        <CardContent>
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
            </div>
            <div>
              <Label>Vendor Type</Label>
              <select className="h-10 w-full rounded-md border px-3" value={form.vendorType} onChange={e=>setForm({...form, vendorType:e.target.value})}>
                {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Payment Terms</Label>
              <select className="h-10 w-full rounded-md border px-3" value={form.paymentTerms} onChange={e=>setForm({...form, paymentTerms:e.target.value})}>
                {PAYMENT_TERMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={form.industry} onChange={e=>setForm({...form, industry:e.target.value})} />
            </div>
            <div>
              <Label>Tax ID</Label>
              <Input value={form.taxId} onChange={e=>setForm({...form, taxId:e.target.value})} placeholder="EIN or Tax ID" />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <textarea 
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
                value={form.address} 
                onChange={e=>setForm({...form, address:e.target.value})}
                placeholder="Full address..."
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <textarea 
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
                value={form.notes} 
                onChange={e=>setForm({...form, notes:e.target.value})}
                placeholder="Additional notes about this vendor..."
              />
            </div>
            <div className="col-span-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Vendor'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
