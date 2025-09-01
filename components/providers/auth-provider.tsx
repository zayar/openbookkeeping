'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  getCurrentUser, 
  login as authLogin, 
  logout as authLogout, 
  switchOrganization as authSwitchOrg,
  isAuthenticated,
  getToken,
  getCurrentOrg,
  setCurrentOrg,
  handleAuthCallback,
  isTokenExpired
} from '../../lib/auth'

// =============================================
// TYPES
// =============================================

interface User {
  id: string
  email: string
  name?: string
  avatar?: string
}

interface Organization {
  id: string
  name: string
  slug: string
  role: string
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}

interface AuthContextType {
  // User state
  user: User | null
  organizations: Organization[]
  currentOrg: Organization | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  switchOrganization: (orgId: string) => Promise<boolean>
  refreshUser: () => Promise<void>
}

// =============================================
// CONTEXT
// =============================================

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // =============================================
  // AUTH ACTIONS
  // =============================================

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Call the BFF login endpoint directly
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        // Store the token
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', result.data.token)
        }
        
        setUser(result.data.user)
        if (result.data.organizations) {
          setOrganizations(result.data.organizations)
          if (result.data.organizations.length > 0) {
            const firstOrg = result.data.organizations[0]
            setCurrentOrgState(firstOrg)
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_org', JSON.stringify(firstOrg))
            }
          }
        }
        setIsLoading(false)
        return { success: true }
      } else {
        setIsLoading(false)
        return { success: false, error: result.error || 'Login failed' }
      }
    } catch (error: any) {
      setIsLoading(false)
      return { success: false, error: error.message || 'Login failed' }
    }
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    try {
      // Call the BFF registration endpoint directly
      const response = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: `${data.firstName} ${data.lastName}`.trim(),
          organizationName: data.organizationName
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Store the token
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', result.data.token)
        }
        
        setUser(result.data.user)
        
        // Convert organization to the expected format
        if (result.data.organization) {
          const org = {
            id: result.data.organization.id,
            name: result.data.organization.name,
            slug: result.data.organization.slug,
            role: 'owner'
          }
          setOrganizations([org])
          setCurrentOrgState(org)
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_org', JSON.stringify(org))
          }
        }
        
        setIsLoading(false)
        return { success: true }
      } else {
        setIsLoading(false)
        return { success: false, error: result.error || 'Registration failed' }
      }
    } catch (error: any) {
      setIsLoading(false)
      return { success: false, error: error.message || 'Registration failed' }
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await authLogout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setOrganizations([])
      setCurrentOrgState(null)
      setIsLoading(false)
    }
  }

  const switchOrganization = async (orgId: string) => {
    const success = await authSwitchOrg(orgId)
    if (success) {
      const org = organizations.find(o => o.id === orgId)
      if (org) {
        setCurrentOrgState(org)
        setCurrentOrg(org)
      }
      await refreshUser()
    }
    return success
  }

  const refreshUser = async () => {
    try {
      const { user: userData, organizations: orgsData } = await getCurrentUser()
      setUser(userData)
      setOrganizations(orgsData)
      
      // Update current org if it's not set or not in the new list
      const savedOrg = getCurrentOrg()
      if (savedOrg && orgsData.find(o => o.id === savedOrg.id)) {
        setCurrentOrgState(savedOrg)
      } else if (orgsData.length > 0) {
        const firstOrg = orgsData[0]
        setCurrentOrgState(firstOrg)
        setCurrentOrg(firstOrg)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  // =============================================
  // INITIALIZATION
  // =============================================

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      
      try {
        // Check for OAuth callback
        if (handleAuthCallback()) {
          // Token was set from URL, now fetch user data
          await refreshUser()
          setIsLoading(false)
          return
        }

        // Check for existing token
        const token = getToken()
        if (token && !isTokenExpired(token)) {
          await refreshUser()
        } else if (token && isTokenExpired(token)) {
          // Token expired, logout
          await logout()
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // =============================================
  // CURRENT ORG SYNC
  // =============================================

  useEffect(() => {
    const savedOrg = getCurrentOrg()
    if (savedOrg && organizations.find(o => o.id === savedOrg.id)) {
      setCurrentOrgState(savedOrg)
    }
  }, [organizations])

  // =============================================
  // CONTEXT VALUE
  // =============================================

  const contextValue: AuthContextType = {
    user,
    organizations,
    currentOrg,
    isLoading,
    isAuthenticated: !!user && isAuthenticated(),
    login,
    register,
    logout,
    switchOrganization,
    refreshUser
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// =============================================
// HOOK
// =============================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// =============================================
// ORGANIZATION HOOK
// =============================================

export function useOrganization() {
  const { currentOrg, organizations, switchOrganization } = useAuth()
  
  return {
    currentOrg,
    organizations,
    switchOrganization,
    hasMultipleOrgs: organizations.length > 1
  }
}
