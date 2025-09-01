import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// =============================================
// ROUTE PROTECTION MIDDLEWARE
// =============================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get auth token from cookies or localStorage (we'll check both)
  const authToken = request.cookies.get('auth-token')?.value || 
                   request.headers.get('authorization')?.replace('Bearer ', '')

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/about', '/contact', '/']
  const authRoutes = ['/login', '/register']
  
  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // If user is trying to access auth routes while already authenticated
  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is trying to access protected routes without authentication
  if (!isPublicRoute && !authToken) {
    // Save the attempted URL to redirect after login
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Allow the request to proceed
  return NextResponse.next()
}

// =============================================
// MIDDLEWARE CONFIG
// =============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
