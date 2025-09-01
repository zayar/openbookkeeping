'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

interface AuthContextType {
  user: User | null
  organizations: Organization[]
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing token on mount
  useEffect(() => {
    const existingToken = localStorage.getItem('auth_token')
    if (existingToken) {
      setToken(existingToken)
      // Optionally validate the token here
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/bff/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (data.success && data.data) {
        const { user: userData, organizations: orgs, token: authToken } = data.data
        
        // Prefer cookie-based session; keep token only for compatibility
        if (authToken) {
          localStorage.setItem('auth_token', authToken)
          setToken(authToken)
        }
        setUser(userData)
        setOrganizations(orgs)
        
        console.log('Login successful:', userData.email)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.message || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      // Call backend logout endpoint if we have a token
      if (token) {
        try {
          await fetch('/api/bff/auth/logout', {
            method: 'POST',
            credentials: 'include',
          })
          console.log('✅ Backend logout successful')
        } catch (error) {
          console.log('⚠️ Backend logout failed, continuing with frontend cleanup:', error.message)
        }
      }
      
      // Clear frontend state
      localStorage.removeItem('auth_token')
      setToken(null)
      setUser(null)
      setOrganizations([])
      
      // Redirect to login page
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Force logout even if there's an error
      localStorage.removeItem('auth_token')
      setToken(null)
      setUser(null)
      setOrganizations([])
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      organizations, 
      token, 
      login, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
