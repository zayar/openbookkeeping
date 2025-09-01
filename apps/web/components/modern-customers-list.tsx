"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Filter, MoreHorizontal, Mail, Phone, Building2, User, TrendingUp, DollarSign, Users, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatDate, getStatusBadgeVariant } from "@/lib/utils"

// Mock data based on your Zoho Books screenshot
const mockCustomers = [
  {
    id: "1",
    name: "21Disney",
    companyName: "",
    email: "subscriptions@datafocus.cloud",
    phone: "09260189806",
    receivables: 0,
    totalInvoiced: 450000,
    lastTransaction: "2024-01-18",
    status: "active",
    avatar: "21"
  },
  {
    id: "2",
    name: "29 Jewellery",
    companyName: "29 Jewellery",
    email: "subscriptions@datafocus.cloud",
    phone: "",
    receivables: 0,
    totalInvoiced: 1250000,
    lastTransaction: "2024-01-18",
    status: "active",
    avatar: "29"
  },
  {
    id: "3",
    name: "3 brother",
    companyName: "3 brother",
    email: "",
    phone: "",
    receivables: 0,
    totalInvoiced: 0,
    lastTransaction: "2023-12-01",
    status: "inactive",
    avatar: "3B"
  },
  {
    id: "4",
    name: "360 Care Myanmar",
    companyName: "360 Care Myanmar",
    email: "",
    phone: "",
    receivables: 0,
    totalInvoiced: 0,
    lastTransaction: null,
    status: "new",
    avatar: "360"
  },
  {
    id: "5",
    name: "38 Station Teppanyaki Restaurant",
    companyName: "38 Station Teppanyaki Restaurant",
    email: "",
    phone: "",
    receivables: 0,
    totalInvoiced: 0,
    lastTransaction: null,
    status: "new",
    avatar: "38"
  }
]

export function ModernCustomersList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredCustomers = useMemo(() => {
    return mockCustomers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = filterStatus === "all" || customer.status === filterStatus
      
      return matchesSearch && matchesFilter
    })
  }, [searchQuery, filterStatus])

  const stats = useMemo(() => {
    return {
      total: mockCustomers.length,
      active: mockCustomers.filter(c => c.status === "active").length,
      totalReceivables: mockCustomers.reduce((sum, c) => sum + c.receivables, 0),
      totalInvoiced: mockCustomers.reduce((sum, c) => sum + c.totalInvoiced, 0)
    }
  }, [])

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const toggleAllCustomers = () => {
    setSelectedCustomers(
      selectedCustomers.length === filteredCustomers.length
        ? []
        : filteredCustomers.map(customer => customer.id)
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "inactive": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "new": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer relationships and track receivables
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Customers</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">+{stats.active} active</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Receivables</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(stats.totalReceivables, "MMK")}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">Current outstanding</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Total Invoiced</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {formatCurrency(stats.totalInvoiced, "MMK")}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400">All time</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">This Month</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">2</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">New customers</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, company, or email..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="new">New</option>
          </select>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                  {customer.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{customer.name}</h3>
                  {customer.companyName && customer.companyName !== customer.name && (
                    <p className="text-xs text-muted-foreground truncate">{customer.companyName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                  {customer.status}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.companyName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{customer.companyName}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <div>
                <div className="text-xs text-muted-foreground">Receivables</div>
                <div className={`text-sm font-semibold ${customer.receivables > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {formatCurrency(customer.receivables, "MMK")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Invoiced</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(customer.totalInvoiced, "MMK")}
                </div>
              </div>
            </div>

            {customer.lastTransaction && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-muted-foreground">Last Transaction</div>
                <div className="text-sm">{formatDate(customer.lastTransaction)}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Table View Toggle */}
      <div className="flex justify-center">
        <Button variant="outline" size="sm">
          Switch to Table View
        </Button>
      </div>

      {filteredCustomers.length === 0 && (
        <div className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No customers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search criteria" : "Get started by adding your first customer"}
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 animate-slide-in-from-bottom">
          <span className="font-medium">
            {selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="secondary" size="sm">
              Export
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCustomers([])}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  )
}
