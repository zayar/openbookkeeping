"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Filter, MoreHorizontal, Edit, Trash2, Eye, ChevronRight, ChevronDown, FolderOpen, Folder, Building, DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Package, Users, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency, cn } from "@/lib/utils"

// Account types based on Zoho Books structure
const accountTypes = [
  // Asset types
  { value: "other_asset", label: "Asset - Other Asset", icon: Package, color: "text-blue-500", bgColor: "bg-blue-50" },
  { value: "other_current_asset", label: "Asset - Other Current Asset", icon: Wallet, color: "text-green-600", bgColor: "bg-green-50" },
  { value: "cash", label: "Asset - Cash", icon: DollarSign, color: "text-green-700", bgColor: "bg-green-50" },
  { value: "bank", label: "Asset - Bank", icon: CreditCard, color: "text-blue-700", bgColor: "bg-blue-50" },
  { value: "fixed_asset", label: "Asset - Fixed Asset", icon: Building, color: "text-purple-600", bgColor: "bg-purple-50" },
  { value: "accounts_receivable", label: "Asset - Accounts Receivable", icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
  { value: "stock", label: "Asset - Stock", icon: Package, color: "text-orange-600", bgColor: "bg-orange-50" },
  { value: "payment_clearing_account", label: "Asset - Payment Clearing Account", icon: Wallet, color: "text-green-500", bgColor: "bg-green-50" },
  { value: "input_tax", label: "Asset - Input Tax", icon: Calculator, color: "text-blue-600", bgColor: "bg-blue-50" },
  { value: "intangible_asset", label: "Asset - Intangible Asset", icon: Building, color: "text-purple-500", bgColor: "bg-purple-50" },
  { value: "non_current_asset", label: "Asset - Non Current Asset", icon: Building, color: "text-purple-700", bgColor: "bg-purple-50" },
  { value: "deferred_tax_asset", label: "Asset - Deferred Tax Asset", icon: Calculator, color: "text-blue-700", bgColor: "bg-blue-50" },
  
  // Liability types
  { value: "other_current_liability", label: "Liability - Other Current Liability", icon: TrendingDown, color: "text-red-500", bgColor: "bg-red-50" },
  { value: "credit_card", label: "Liability - Credit Card", icon: CreditCard, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "non_current_liability", label: "Liability - Non Current Liability", icon: TrendingDown, color: "text-red-700", bgColor: "bg-red-50" },
  { value: "other_liability", label: "Liability - Other Liability", icon: TrendingDown, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "accounts_payable", label: "Liability - Accounts Payable", icon: Users, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "overseas_tax_payable", label: "Liability - Overseas Tax Payable", icon: Calculator, color: "text-red-700", bgColor: "bg-red-50" },
  { value: "output_tax", label: "Liability - Output Tax", icon: Calculator, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "deferred_tax_liability", label: "Liability - Deferred Tax Liability", icon: Calculator, color: "text-red-700", bgColor: "bg-red-50" },
  
  // Equity types
  { value: "equity", label: "Equity - Equity", icon: Calculator, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  
  // Income types
  { value: "income", label: "Income - Income", icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50" },
  { value: "other_income", label: "Income - Other Income", icon: TrendingUp, color: "text-green-500", bgColor: "bg-green-50" },
  
  // Expense types
  { value: "expense", label: "Expense - Expense", icon: TrendingDown, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "cost_of_goods_sold", label: "Expense - Cost Of Goods Sold", icon: Package, color: "text-orange-700", bgColor: "bg-orange-50" },
  { value: "other_expense", label: "Expense - Other Expense", icon: TrendingDown, color: "text-red-500", bgColor: "bg-red-50" }
]

// Mock data based on Zoho Books screenshot
const mockAccounts = [
  {
    id: "1",
    code: "1000",
    name: "Software Install",
    type: "other_asset",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "Software and installation costs",
    isActive: true,
    hasSubAccounts: false,
    level: 0
  },
  {
    id: "2",
    code: "1100",
    name: "Advance Tax",
    type: "other_current_asset",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "Tax payments in advance",
    isActive: true,
    hasSubAccounts: false,
    level: 0
  },
  {
    id: "3",
    code: "1200",
    name: "Employee Advance",
    type: "other_current_asset",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "Advances given to employees",
    isActive: true,
    hasSubAccounts: false,
    level: 0
  },
  {
    id: "4",
    code: "1300",
    name: "Prepaid Expenses",
    type: "other_current_asset",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "Expenses paid in advance",
    isActive: true,
    hasSubAccounts: true,
    level: 0
  },
  {
    id: "5",
    code: "1310",
    name: "Prepaid Expenses for Server Hosting",
    type: "other_current_asset",
    parent: "4",
    balance: 0,
    currency: "MMK",
    description: "Server hosting costs paid in advance",
    isActive: true,
    hasSubAccounts: false,
    level: 1
  },
  {
    id: "6",
    code: "1320",
    name: "Advance for Office Rental",
    type: "other_current_asset",
    parent: "4",
    balance: 0,
    currency: "MMK",
    description: "Office rent paid in advance",
    isActive: true,
    hasSubAccounts: false,
    level: 1
  },
  {
    id: "7",
    code: "1330",
    name: "Advance for Zoho",
    type: "other_current_asset",
    parent: "4",
    balance: 0,
    currency: "MMK",
    description: "Zoho subscription paid in advance",
    isActive: true,
    hasSubAccounts: false,
    level: 1
  },
  {
    id: "8",
    code: "1400",
    name: "Sales to Customers (Cash)",
    type: "other_current_asset",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "Cash sales to customers",
    isActive: true,
    hasSubAccounts: false,
    level: 0
  },
  {
    id: "9",
    code: "1500",
    name: "K PAY Su Mar (KPAY)",
    type: "bank",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "K PAY digital wallet account",
    isActive: true,
    hasSubAccounts: false,
    level: 0,
    recentTransactions: [
      { date: "2024-10-31", description: "Transfer Fund", type: "Transfer Fund", debit: 28000000, credit: 0 },
      { date: "2024-09-03", description: "Emily Su USA Cosmetic & Bag", type: "Invoice Payment", debit: 0, credit: 35400000 },
      { date: "2024-05-08", description: "My Garden", type: "Invoice Payment", debit: 0, credit: 17400000 }
    ]
  },
  {
    id: "10",
    code: "1600",
    name: "Undeposited Funds",
    type: "cash",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "Funds received but not yet deposited",
    isActive: true,
    hasSubAccounts: false,
    level: 0
  },
  {
    id: "11",
    code: "1700",
    name: "Petty Cash",
    type: "cash",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "Small cash for daily expenses",
    isActive: true,
    hasSubAccounts: false,
    level: 0
  },
  {
    id: "12",
    code: "1800",
    name: "Cash In Hand",
    type: "cash",
    parent: null,
    balance: 0,
    currency: "MMK",
    description: "Physical cash on hand",
    isActive: true,
    hasSubAccounts: false,
    level: 0
  }
]

export function ModernChartOfAccounts() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAccount, setNewAccount] = useState({
    name: "",
    code: "",
    type: "",
    parent: "",
    description: "",
    isSubAccount: false,
    addToWatchlist: false
  })

  const filteredAccounts = useMemo(() => {
    return mockAccounts.filter(account => {
      const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.code.includes(searchQuery) ||
        account.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = filterType === "all" || account.type === filterType
      
      return matchesSearch && matchesFilter
    })
  }, [searchQuery, filterType])

  const getAccountTypeInfo = (type: string) => {
    return accountTypes.find(t => t.value === type) || accountTypes[0]
  }

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  const renderAccountRow = (account: any, index: number) => {
    const typeInfo = getAccountTypeInfo(account.type)
    const IconComponent = typeInfo.icon
    const isExpanded = expandedAccounts.has(account.id)
    const hasChildren = account.hasSubAccounts
    const childAccounts = mockAccounts.filter(a => a.parent === account.id)

    return (
      <div key={account.id}>
        <div
          className={cn(
            "border-t hover:bg-muted/30 transition-colors cursor-pointer group",
            index % 2 === 0 ? 'bg-background' : 'bg-muted/20',
            selectedAccount === account.id && 'bg-blue-50 dark:bg-blue-950'
          )}
          onClick={() => setSelectedAccount(account.id)}
        >
          <div className="flex items-center p-4">
            {/* Expand/Collapse Button */}
            <div className="w-6 flex justify-center" style={{ marginLeft: `${account.level * 20}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpand(account.id)
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              ) : account.level > 0 ? (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-2 h-px bg-border"></div>
                </div>
              ) : null}
            </div>

            {/* Account Icon and Name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn("p-2 rounded-lg", typeInfo.bgColor)}>
                <IconComponent className={cn("h-4 w-4", typeInfo.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-600 hover:text-blue-800">
                    {account.name}
                  </span>
                  {account.level > 0 && (
                    <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
                      Sub Account
                    </span>
                  )}
                </div>
                {account.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {account.description}
                  </div>
                )}
              </div>
            </div>

            {/* Account Code */}
            <div className="w-24 text-center">
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {account.code}
              </span>
            </div>

            {/* Account Type */}
            <div className="w-40 text-center">
              <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", typeInfo.bgColor, typeInfo.color)}>
                <IconComponent className="h-3 w-3" />
                {typeInfo.label}
              </span>
            </div>

            {/* Balance */}
            <div className="w-32 text-right">
              <span className="accounting-number font-semibold">
                {formatCurrency(account.balance, account.currency)}
              </span>
            </div>

            {/* Actions */}
            <div className="w-24 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Child Accounts */}
        {hasChildren && isExpanded && childAccounts.map((childAccount, childIndex) => 
          renderAccountRow(childAccount, childIndex)
        )}
      </div>
    )
  }

  const accountTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    accountTypes.forEach(type => {
      counts[type.value] = mockAccounts.filter(acc => acc.type === type.value).length
    })
    return counts
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your accounting structure and categories
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Account</DialogTitle>
              </DialogHeader>
              <CreateAccountForm 
                account={newAccount}
                setAccount={setNewAccount}
                onSave={() => setShowCreateDialog(false)}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Type Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {accountTypes.map(type => {
          const IconComponent = type.icon
          const count = accountTypeCounts[type.value] || 0
          return (
            <div
              key={type.value}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                type.bgColor,
                filterType === type.value && "ring-2 ring-blue-500"
              )}
              onClick={() => setFilterType(filterType === type.value ? "all" : type.value)}
            >
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className={cn("h-5 w-5", type.color)} />
                <span className={cn("text-sm font-medium", type.color)}>
                  {type.label}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {count}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                accounts
              </div>
            </div>
          )
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts by name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm"
          >
            <option value="all">All Types</option>
            {accountTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      {/* Account Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="bg-muted/50 border-b">
            <div className="flex items-center p-4">
              <div className="w-6"></div> {/* Space for expand button */}
              <div className="flex-1 font-medium">Account Name</div>
              <div className="w-24 text-center font-medium">Code</div>
              <div className="w-40 text-center font-medium">Type</div>
              <div className="w-32 text-right font-medium">Balance</div>
              <div className="w-24 text-center font-medium">Actions</div>
            </div>
          </div>

          {/* Account Rows */}
          <div>
            {filteredAccounts
              .filter(account => account.level === 0) // Only show top-level accounts initially
              .map((account, index) => renderAccountRow(account, index))}
          </div>
        </div>

        {filteredAccounts.length === 0 && (
          <div className="p-8 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No accounts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search criteria" : "Get started by creating your first account"}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </div>
        )}
      </div>

      {/* Selected Account Details */}
      {selectedAccount && (
        <SelectedAccountDetails 
          account={mockAccounts.find(a => a.id === selectedAccount)!}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  )
}

function CreateAccountForm({ account, setAccount, onSave, onCancel }: {
  account: any
  setAccount: (account: any) => void
  onSave: () => void
  onCancel: () => void
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement account creation logic
    console.log("Creating account:", account)
    onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="accountType">Account Type*</Label>
          <Select value={account.type} onValueChange={(value) => setAccount({ ...account, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              {accountTypes.map(type => {
                const IconComponent = type.icon
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className={cn("h-4 w-4", type.color)} />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {account.type && (
            <div className={cn("p-3 rounded-lg text-sm", getAccountTypeInfo(account.type).bgColor)}>
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4" />
                <span className="font-medium">
                  {getAccountTypeInfo(account.type).label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Track special assets like goodwill and other intangible assets
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountName">Account Name*</Label>
          <Input
            id="accountName"
            value={account.name}
            onChange={(e) => setAccount({ ...account, name: e.target.value })}
            placeholder="Enter account name"
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="subAccount"
          checked={account.isSubAccount}
          onCheckedChange={(checked) => setAccount({ ...account, isSubAccount: checked })}
        />
        <Label htmlFor="subAccount" className="text-sm">
          Make this a sub-account
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountCode">Account Code</Label>
        <Input
          id="accountCode"
          value={account.code}
          onChange={(e) => setAccount({ ...account, code: e.target.value })}
          placeholder="Enter account code (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={account.description}
          onChange={(e) => setAccount({ ...account, description: e.target.value })}
          placeholder="Max. 500 characters"
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="watchlist"
          checked={account.addToWatchlist}
          onCheckedChange={(checked) => setAccount({ ...account, addToWatchlist: checked })}
        />
        <Label htmlFor="watchlist" className="text-sm">
          Add to the watchlist on my dashboard
        </Label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save
        </Button>
      </div>
    </form>
  )
}

function SelectedAccountDetails({ account, onClose }: { 
  account: any
  onClose: () => void 
}) {
  const typeInfo = getAccountTypeInfo(account.type)
  const IconComponent = typeInfo.icon

  return (
    <div className="border rounded-lg bg-card p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-lg", typeInfo.bgColor)}>
            <IconComponent className={cn("h-6 w-6", typeInfo.color)} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{account.name}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", typeInfo.bgColor, typeInfo.color)}>
                {typeInfo.label}
              </span>
              <span className="text-sm text-muted-foreground">Code: {account.code}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          ×
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Info */}
        <div className="space-y-4">
          <h3 className="font-semibold">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Closing Balance:</span>
              <span className={cn("font-semibold", account.balance >= 0 ? "text-green-600" : "text-red-600")}>
                {formatCurrency(account.balance, account.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency:</span>
              <span>{account.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={account.isActive ? "text-green-600" : "text-red-600"}>
                {account.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">Description:</span>
            <p className="text-sm mt-1">{account.description || "No description"}</p>
          </div>
        </div>

        {/* Recent Transactions */}
        {account.recentTransactions && (
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Transactions</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">FCY</Button>
                <Button variant="outline" size="sm">BCY</Button>
              </div>
            </div>
            <div className="space-y-2">
              {account.recentTransactions.map((transaction: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{transaction.description}</div>
                    <div className="text-xs text-muted-foreground">{transaction.date} • {transaction.type}</div>
                  </div>
                  <div className="text-right">
                    {transaction.debit > 0 && (
                      <div className="text-sm font-semibold text-red-600">
                        {formatCurrency(transaction.debit, account.currency)}
                      </div>
                    )}
                    {transaction.credit > 0 && (
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(transaction.credit, account.currency)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="link" size="sm" className="w-full">
                Show more details
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
