"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Filter, MoreHorizontal, Send, Eye, Download, DollarSign, Clock, AlertTriangle, CheckCircle, Calendar, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatDate, getStatusBadgeVariant } from "@/lib/utils"

// Mock data based on your Zoho Books screenshot
const mockInvoices = [
  {
    id: "1",
    invoiceNumber: "INV-002344",
    date: "2025-08-15",
    dueDate: "2025-08-15",
    customerName: "M & M Cosmetic House",
    orderNumber: "",
    status: "draft",
    amount: 53400000,
    balanceDue: 53400000,
    branch: "Head Office"
  },
  {
    id: "2",
    invoiceNumber: "INV-002343",
    date: "2025-08-15",
    dueDate: "2025-08-15",
    customerName: "Homie Z",
    orderNumber: "",
    status: "paid",
    amount: 25000000,
    balanceDue: 0,
    branch: "Head Office"
  },
  {
    id: "3",
    invoiceNumber: "INV-002342",
    date: "2025-08-14",
    dueDate: "2025-08-14",
    customerName: "Mistime Myanmar",
    orderNumber: "",
    status: "draft",
    amount: 35400000,
    balanceDue: 35400000,
    branch: "Head Office"
  },
  {
    id: "4",
    invoiceNumber: "INV-002341",
    date: "2025-08-14",
    dueDate: "2025-08-14",
    customerName: "CHOCO Branded Collection",
    orderNumber: "",
    status: "draft",
    amount: 46800000,
    balanceDue: 46800000,
    branch: "Head Office"
  },
  {
    id: "5",
    invoiceNumber: "INV-002340",
    date: "2025-08-13",
    dueDate: "2025-08-13",
    customerName: "KKS Thai Food & B.B.Q",
    orderNumber: "",
    status: "draft",
    amount: 360000000,
    balanceDue: 360000000,
    branch: "Head Office"
  }
]

export function ModernInvoiceList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredInvoices = useMemo(() => {
    return mockInvoices.filter(invoice => {
      const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = filterStatus === "all" || invoice.status === filterStatus
      
      return matchesSearch && matchesFilter
    })
  }, [searchQuery, filterStatus])

  const paymentSummary = useMemo(() => {
    const totalOutstanding = mockInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0)
    const dueToday = mockInvoices.filter(inv => {
      const today = new Date().toISOString().split('T')[0]
      return inv.dueDate === today && inv.balanceDue > 0
    }).reduce((sum, inv) => sum + inv.balanceDue, 0)
    
    const dueWithin30Days = mockInvoices.filter(inv => {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      return new Date(inv.dueDate) <= thirtyDaysFromNow && inv.balanceDue > 0
    }).reduce((sum, inv) => sum + inv.balanceDue, 0)

    const overdue = mockInvoices.filter(inv => {
      const today = new Date().toISOString().split('T')[0]
      return inv.dueDate < today && inv.balanceDue > 0
    }).reduce((sum, inv) => sum + inv.balanceDue, 0)

    return {
      totalOutstanding,
      dueToday,
      dueWithin30Days,
      overdue,
      averageDaysForPayment: 5
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "sent": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="h-3 w-3" />
      case "draft": return <Clock className="h-3 w-3" />
      case "sent": return <Send className="h-3 w-3" />
      case "overdue": return <AlertTriangle className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your customer invoices
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-gradient-to-r from-orange-50 via-orange-100 to-yellow-50 dark:from-orange-950 dark:via-orange-900 dark:to-yellow-950 p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Payment Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {formatCurrency(paymentSummary.totalOutstanding, "MMK")}
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300">Total Outstanding Receivables</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(paymentSummary.dueToday, "MMK")}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">Due Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(paymentSummary.dueWithin30Days, "MMK")}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Due Within 30 Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(paymentSummary.overdue, "MMK")}
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">Overdue Invoice</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {paymentSummary.averageDaysForPayment} Days
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">Average Days for Getting Paid</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Invoices</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{mockInvoices.length}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">This month</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Paid Invoices</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {mockInvoices.filter(inv => inv.status === 'paid').length}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              {formatCurrency(mockInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0), "MMK")}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Draft Invoices</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {mockInvoices.filter(inv => inv.status === 'draft').length}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400">Pending approval</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Collection Rate</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">87%</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Last 30 days</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices by number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-12 p-4">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Invoice#</th>
                <th className="text-left p-4 font-medium">Order Number</th>
                <th className="text-left p-4 font-medium">Customer Name</th>
                <th className="text-center p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Due Date</th>
                <th className="text-right p-4 font-medium">Amount</th>
                <th className="text-right p-4 font-medium">Balance Due</th>
                <th className="text-left p-4 font-medium">Branch</th>
                <th className="w-12 p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, index) => (
                <tr
                  key={invoice.id}
                  className={`border-t hover:bg-muted/30 transition-colors cursor-pointer ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  }`}
                >
                  <td className="p-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{formatDate(invoice.date)}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                      {invoice.invoiceNumber}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-muted-foreground">
                      {invoice.orderNumber || "—"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-semibold">
                        {invoice.customerName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{invoice.customerName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{formatDate(invoice.dueDate)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="accounting-number font-semibold">
                      {formatCurrency(invoice.amount, "MMK")}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`accounting-number font-semibold ${invoice.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(invoice.balanceDue, "MMK")}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {invoice.branch}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No invoices found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search criteria" : "Get started by creating your first invoice"}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions for selected invoices */}
      {selectedInvoices.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 animate-slide-in-from-bottom">
          <span className="font-medium">
            {selectedInvoices.length} invoice{selectedInvoices.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedInvoices([])}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  )
}
