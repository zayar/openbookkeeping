import * as React from "react"
import { ChevronDown, Check } from "lucide-react"

export interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

export interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

export interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export interface SelectItemProps {
  children: React.ReactNode
  value: string
  className?: string
}

export interface SelectValueProps {
  placeholder?: string
  className?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {}
})

const Select = ({ children, value, onValueChange, disabled }: SelectProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = ({ children, className = '' }: SelectTriggerProps) => {
  const { open, setOpen } = React.useContext(SelectContext)

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

const SelectValue = ({ placeholder, className = '' }: SelectValueProps) => {
  const { value } = React.useContext(SelectContext)

  return (
    <span className={`block truncate ${className}`}>
      {value || placeholder}
    </span>
  )
}

const SelectContent = ({ children, className = '' }: SelectContentProps) => {
  const { open, setOpen } = React.useContext(SelectContext)

  if (!open) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setOpen(false)}
      />
      <div className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm ${className}`}>
        {children}
      </div>
    </>
  )
}

const SelectItem = ({ children, value, className = '' }: SelectItemProps) => {
  const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext)

  const handleSelect = () => {
    onValueChange?.(value)
    setOpen(false)
  }

  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={`relative cursor-pointer select-none py-2 pl-10 pr-4 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none w-full ${
        isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
      } ${className}`}
    >
      <span className={`block truncate ${isSelected ? 'font-medium' : 'font-normal'}`}>
        {children}
      </span>
      {isSelected && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
