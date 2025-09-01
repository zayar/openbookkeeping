import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number,
  currency: string = "MMK",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency === "MMK" ? "USD" : currency,
    minimumFractionDigits: 2,
  }).format(amount / 100) // Assuming amounts are stored in cents
}

export function formatDate(date: Date | string, format: "short" | "long" = "short"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  
  if (format === "long") {
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }
  
  return dateObj.toLocaleDateString("en-US")
}

export function formatAccountingNumber(amount: number, showSign: boolean = true): string {
  const formatted = Math.abs(amount / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  if (!showSign) return formatted
  
  return amount >= 0 ? formatted : `(${formatted})`
}

export function getStatusBadgeVariant(status: string): string {
  switch (status.toLowerCase()) {
    case "draft":
      return "status-draft"
    case "sent":
      return "status-sent"
    case "paid":
      return "status-paid"
    case "overdue":
      return "status-overdue"
    case "cancelled":
      return "status-cancelled"
    default:
      return "status-draft"
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}