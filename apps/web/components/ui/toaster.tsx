'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToasterContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToasterContext = createContext<ToasterContextType | undefined>(undefined)

export function Toaster() {
  const { toasts, removeToast } = useToaster()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "bg-white border rounded-lg shadow-lg p-4 max-w-sm",
            toast.variant === 'destructive' && "border-red-200 bg-red-50"
          )}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{toast.title}</h4>
              {toast.description && (
                <p className="text-sm text-gray-600 mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function useToaster() {
  const context = useContext(ToasterContext)
  if (context === undefined) {
    throw new Error('useToaster must be used within a ToasterProvider')
  }
  return context
}

export function useToast() {
  const { addToast } = useToaster()
  
  return {
    toast: (toast: Omit<Toast, 'id'>) => {
      addToast({ ...toast, id: Math.random().toString() })
    }
  }
}
