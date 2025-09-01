'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Boxes, ShoppingCart, ChevronRight, ChevronDown, BookOpen, CreditCard, Users, Building2, FileText, LogOut, Receipt, UserCheck, MapPin, Settings, Package, Warehouse, Calendar, Building } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { LogoutDialog } from '@/components/ui/logout-dialog'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: Home },
  { href: '/items', label: 'Items', Icon: Boxes },
  { href: '/warehouses', label: 'Warehouses', Icon: Warehouse },
  { href: '/accounts', label: 'Accounts', Icon: BookOpen },
  { href: '/bank-accounts', label: 'Bank Accounts', Icon: CreditCard },
  { href: '/customers', label: 'Customers', Icon: Users },
  { href: '/vendors', label: 'Vendors', Icon: Building2 },
  { href: '/taxes', label: 'Taxes', Icon: Receipt },
  { href: '/salespersons', label: 'Salespersons', Icon: UserCheck },
  { href: '/branches', label: 'Branches', Icon: MapPin },
  { 
    href: '/sales', 
    label: 'Sales', 
    Icon: ShoppingCart,
    hasSubmenu: true,
    children: [
      { href: '/invoices', label: 'Invoices', Icon: FileText },
    ]
  },
  { 
    href: '/settings', 
    label: 'Settings', 
    Icon: Settings,
    hasSubmenu: true,
    children: [
      { href: '/settings/organization', label: 'Organization', Icon: Building },
      { href: '/settings/accounting-periods', label: 'Accounting Periods', Icon: Calendar },
      { href: '/settings/opening-balances', label: 'Opening Balances', Icon: Package },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['sales']) // Sales expanded by default
  const { logout } = useAuth()

  const toggleSubmenu = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="hidden md:flex md:w-64 lg:w-72 border-r bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-screen flex-col px-3 py-6">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600" />
          <div className="text-lg font-semibold tracking-tight">OpenAccounting</div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const { href, label, Icon, hasSubmenu, children } = item
            const active = pathname?.startsWith(href) || (children && children.some(child => pathname?.startsWith(child.href)))
            const expanded = expandedItems.includes(href.replace('/', ''))

            return (
              <div key={href}>
                {hasSubmenu ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(href.replace('/', ''))}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        active ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                      <span className="flex-1 text-left">{label}</span>
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      )}
                      {active && (
                        <motion.span
                          layoutId="nav-active-pill"
                          className="absolute inset-0 -z-10 rounded-xl bg-blue-50"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                    </button>
                    {expanded && children && (
                      <div className="ml-6 mt-1 space-y-1">
                        {children.map((child) => {
                          const childActive = pathname?.startsWith(child.href)
                          return (
                            <Link key={child.href} href={child.href} className="block">
                              <div className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                                childActive ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                              }`}>
                                <child.Icon className={`h-4 w-4 ${childActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                                <span className="flex-1">{child.label}</span>
                                {childActive && (
                                  <motion.span
                                    layoutId="nav-active-pill-child"
                                    className="absolute inset-0 -z-10 rounded-lg bg-blue-50"
                                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                  />
                                )}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={href} className="block">
                    <div className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      active ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                    }`}>
                      <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600" />
                      {active && (
                        <motion.span
                          layoutId="nav-active-pill"
                          className="absolute inset-0 -z-10 rounded-xl bg-blue-50"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                    </div>
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="mt-auto mb-4">
          <LogoutDialog onLogout={handleLogout} variant="danger" size="md">
            <LogOut className="h-5 w-5 text-red-500" />
            <span className="flex-1 text-left">Logout</span>
          </LogoutDialog>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 text-xs text-slate-600">
          <div className="font-medium text-slate-800">Tip</div>
          Press ⌘K to open command menu
        </div>
      </div>
    </div>
  )
}


