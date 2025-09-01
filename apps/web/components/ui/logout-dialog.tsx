'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, AlertTriangle } from 'lucide-react'

interface LogoutDialogProps {
  onLogout: () => Promise<void>
  variant?: 'default' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

export function LogoutDialog({ onLogout, variant = 'default', size = 'md', children }: LogoutDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
      setIsOpen(false)
    }
  }

  const buttonVariants = {
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
  }

  const buttonSizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={`${buttonVariants[variant]} ${buttonSizes[size]} transition-colors`}
      >
        {children || (
          <>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </>
          )}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
                <p className="text-sm text-gray-600">Are you sure you want to logout?</p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
