'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/providers/auth-provider'
import { Building2, Shield, Zap, Users, BarChart3, Lock } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">OpenAccounting</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Modern Accounting
            <span className="text-blue-600"> Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Powerful, headless accounting software built on Open Accounting. 
            Multi-tenant, secure, and designed for modern businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                Sign In to Your Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to manage your finances
            </h2>
            <p className="text-xl text-gray-600">
              Built with modern standards, security, and ease of use in mind
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Financial Reporting</CardTitle>
                <CardDescription>
                  Comprehensive trial balance, P&L, and balance sheet reports with real-time data
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Multi-Tenant</CardTitle>
                <CardDescription>
                  Perfect for accounting firms managing multiple clients with complete data isolation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Fast & Modern</CardTitle>
                <CardDescription>
                  Built with Next.js, React, and modern web technologies for lightning-fast performance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  JWT authentication, role-based access control, and audit logging for compliance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Open Accounting Core</CardTitle>
                <CardDescription>
                  Built on the proven Open Accounting engine with double-entry bookkeeping
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Organization Management</CardTitle>
                <CardDescription>
                  Easy organization setup with role-based permissions and team collaboration
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 text-center">
          <Card className="border-none shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold mb-4">
                Ready to streamline your accounting?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of businesses using modern accounting software
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                    Start Your Free Trial
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600">
                  Schedule Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-6 w-6" />
                <span className="text-lg font-bold">OpenAccounting</span>
              </div>
              <p className="text-gray-400">
                Modern accounting software for modern businesses
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 OpenAccounting. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
