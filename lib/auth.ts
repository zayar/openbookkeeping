import axios from 'axios'

// =============================================
// AUTHENTICATION CLIENT
// =============================================

const API_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'

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

interface AuthResponse {
  success: boolean
  data?: {
    user: User
    organizations?: Organization[]
    organization?: Organization
    token: string
  }
  error?: string
}

// Create axios instance with interceptors
const authAPI = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10000,
})

// Request interceptor to add auth token
authAPI.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
authAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      removeToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// =============================================
// TOKEN MANAGEMENT
// =============================================

const TOKEN_KEY = 'auth_token'
const ORG_KEY = 'current_org'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ORG_KEY)
}

export function getCurrentOrg(): Organization | null {
  if (typeof window === 'undefined') return null
  const orgData = localStorage.getItem(ORG_KEY)
  return orgData ? JSON.parse(orgData) : null
}

export function setCurrentOrg(org: Organization): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ORG_KEY, JSON.stringify(org))
}

// =============================================
// AUTH API FUNCTIONS
// =============================================

export async function register(data: {
  email: string
  password: string
  name: string
  organizationName: string
  organizationDescription?: string
}): Promise<AuthResponse> {
  try {
    const response = await authAPI.post('/auth/register', data)
    
    if (response.data.success) {
      setToken(response.data.data.token)
      if (response.data.data.organization) {
        setCurrentOrg({
          id: response.data.data.organization.id,
          name: response.data.data.organization.name,
          slug: response.data.data.organization.slug,
          role: 'owner'
        })
      }
    }
    
    return response.data
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Registration failed'
    }
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await authAPI.post('/auth/login', { email, password })
    
    if (response.data.success) {
      setToken(response.data.data.token)
      if (response.data.data.organizations?.[0]) {
        setCurrentOrg({
          id: response.data.data.organizations[0].id,
          name: response.data.data.organizations[0].name,
          slug: response.data.data.organizations[0].slug,
          role: response.data.data.organizations[0].members[0]?.role || 'member'
        })
      }
    }
    
    return response.data
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Login failed'
    }
  }
}

export async function logout(): Promise<void> {
  try {
    await authAPI.post('/auth/logout')
  } catch (error) {
    // Continue with logout even if API call fails
  } finally {
    removeToken()
    window.location.href = '/login'
  }
}

export async function getCurrentUser(): Promise<{
  user: User | null
  organizations: Organization[]
}> {
  try {
    const response = await authAPI.get('/auth/me')
    
    if (response.data.success) {
      const organizations = response.data.data.organizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: org.members[0]?.role || 'member'
      }))
      
      return {
        user: response.data.data.user,
        organizations
      }
    }
    
    return { user: null, organizations: [] }
  } catch (error) {
    return { user: null, organizations: [] }
  }
}

export async function switchOrganization(organizationId: string): Promise<boolean> {
  try {
    const response = await authAPI.post('/auth/switch-organization', { organizationId })
    
    if (response.data.success) {
      setToken(response.data.data.token)
      // Update current org in storage will be handled by the organization context
      return true
    }
    
    return false
  } catch (error) {
    return false
  }
}

// =============================================
// GOOGLE OAUTH
// =============================================

export function loginWithGoogle(): void {
  window.location.href = `${API_URL}/auth/google`
}

// =============================================
// AUTH UTILITIES
// =============================================

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJWT(token)
  if (!payload?.exp) return true
  
  return Date.now() >= payload.exp * 1000
}

export function getUserFromToken(token: string): User | null {
  const payload = parseJWT(token)
  if (!payload) return null
  
  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name
  }
}

// =============================================
// URL PARAMETER HANDLING (for OAuth callbacks)
// =============================================

export function handleAuthCallback(): boolean {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  const error = urlParams.get('error')
  
  if (error) {
    console.error('Auth error:', error)
    return false
  }
  
  if (token) {
    setToken(token)
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname)
    return true
  }
  
  return false
}
