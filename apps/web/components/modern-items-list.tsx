"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Filter, MoreHorizontal, Edit, Trash2, Package, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatAccountingNumber } from "@/lib/utils"

// Mock data - replace with actual API calls
const mockItems = [
  {
    id: "1",
    name: "AMR Project",
    sku: "",
    purchaseDescription: "",
    purchaseRate: 0,
    description: "AMR Project",
    rate: 100,
    stockOnHand: 0,
    usageUnit: "pcs"
  },
  {
    id: "2",
    name: "API Development for Investment Information",
    sku: "",
    purchaseDescription: "",
    purchaseRate: 0,
    description: "API Development",
    rate: 250000,
    stockOnHand: 0,
    usageUnit: "project"
  },
  {
    id: "3",
    name: "AYA Zay Market Eco System Platform",
    sku: "",
    purchaseDescription: "",
    purchaseRate: 0,
    description: "Market Platform",
    rate: 25000000,
    stockOnHand: 0,
    usageUnit: "year"
  },
  {
    id: "4",
    name: "B Print-Printer",
    sku: "DMP3201",
    purchaseDescription: "",
    purchaseRate: 26000000,
    description: "Printer Equipment",
    rate: 0,
    stockOnHand: 100,
    usageUnit: "pcs"
  },
  {
    id: "5",
    name: "Cash Flow App",
    sku: "",
    purchaseDescription: "",
    purchaseRate: 0,
    description: "Financial Application",
    rate: 9000000,
    stockOnHand: 0,
    usageUnit: "license"
  }
]

export function ModernItemsList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const filteredItems = useMemo(() => {
    return mockItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const toggleAllItems = () => {
    setSelectedItems(
      selectedItems.length === filteredItems.length
        ? []
        : filteredItems.map(item => item.id)
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items</h1>
          <p className="text-muted-foreground mt-1">
            Manage your products and services catalog
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Items</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{mockItems.length}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">+12% from last month</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Avg. Rate</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(5800000)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">+8% from last month</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">In Stock</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">100</div>
            <div className="text-xs text-orange-600 dark:text-orange-400">2 items</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Services</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">3</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">60% of total</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name, SKU, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button variant="outline" size="sm">
            Import
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-12 p-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleAllItems}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">SKU</th>
                <th className="text-left p-4 font-medium">Purchase Rate</th>
                <th className="text-left p-4 font-medium">Description</th>
                <th className="text-right p-4 font-medium">Rate</th>
                <th className="text-center p-4 font-medium">Stock</th>
                <th className="text-center p-4 font-medium">Unit</th>
                <th className="w-12 p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-t hover:bg-muted/30 transition-colors ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  }`}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {item.sku || "—"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="accounting-number">
                      {item.purchaseRate > 0 ? formatCurrency(item.purchaseRate, "MMK") : "—"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-muted-foreground">
                      {item.description || "—"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="accounting-number font-semibold">
                      {item.rate > 0 ? formatCurrency(item.rate, "MMK") : "—"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`font-medium ${item.stockOnHand > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {item.stockOnHand}
                      </span>
                      {item.stockOnHand > 0 && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {item.usageUnit}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center">
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

        {filteredItems.length === 0 && (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search criteria" : "Get started by creating your first item"}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Item
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 animate-slide-in-from-bottom">
          <span className="font-medium">
            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedItems([])}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  )
}
