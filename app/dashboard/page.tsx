'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useAuth, useOrganization } from '@/components/providers/auth-provider'
import { Building2, LogOut, Settings, User, DollarSign, TrendingUp, Users, FileText } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { currentOrg } = useOrganization()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">OpenAccounting</h1>
              </div>
              {currentOrg && (
                <Badge variant="secondary" className="text-sm">
                  {currentOrg.name}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Welcome, {user?.name || user?.email}</span>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          
          <div className="pb-4">
            <p className="text-gray-600">Welcome to your accounting dashboard</p>
            <div className="flex space-x-3 mt-4">
              <Button onClick={() => router.push('/accounts')}>
                Chart of Accounts
              </Button>
              <Button onClick={() => router.push('/journal/new')}>
                New Journal Entry
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">
                Current available cash
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">
                Money owed to you
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accounts Payable</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">
                Money you owe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income YTD</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">
                Year to date net income
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common accounting tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/journal/new')}
              >
                Create Journal Entry
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/accounts')}
              >
                Manage Accounts
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/reports/trial-balance')}
              >
                View Trial Balance
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/customers')}
              >
                Manage Customers
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/invoices')}
              >
                Create Invoice
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest journal entries and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                No recent activity to display
                <br />
                <span className="text-xs">Start by creating your first journal entry</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organization Info */}
        {currentOrg && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>Current organization details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{currentOrg.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Role:</span>
                    <Badge variant={currentOrg.role === 'owner' ? 'default' : 'secondary'}>
                      {currentOrg.role}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Slug:</span>
                    <span className="text-sm text-gray-500">{currentOrg.slug}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
