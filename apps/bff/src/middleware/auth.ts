import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'
import { prisma } from '../services/database.cloud-sql-only'

// =============================================
// JWT TOKEN MANAGEMENT
// =============================================

interface JWTPayload {
  userId: string
  email: string
  name?: string
  organizationId?: string
  role?: string
  iat?: number
  exp?: number
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload
  organizationId?: string
}

export class JWTService {
  private static secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
  private static expiresIn = process.env.JWT_EXPIRES_IN || '7d'

  /**
   * Generate JWT token for user
   */
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'openaccounting-bff',
      audience: 'openaccounting-app'
    })
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as JWTPayload
      return decoded
    } catch (error) {
      logger.warn('Invalid JWT token:', error)
      return null
    }
  }

  /**
   * Generate organization-scoped token
   */
  static generateOrgToken(userId: string, organizationId: string, role: string = 'member'): string {
    return jwt.sign(
      { userId, organizationId, role },
      this.secret,
      {
        expiresIn: '24h', // Shorter expiry for org-scoped tokens
        issuer: 'openaccounting-bff',
        audience: 'openaccounting-app'
      }
    )
  }
}

// =============================================
// AUTHENTICATION MIDDLEWARE
// =============================================

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.cookies?.['auth-token']

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required'
      })
    }

    const decoded = JWTService.verifyToken(token)
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      })
    }

    req.user = decoded
    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    })
  }
}

/**
 * Middleware to require organization context and validate access
 */
export const requireOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    // Get organization ID from different sources
    const organizationId = 
      req.params.organizationId || 
      req.body.organizationId || 
      req.query.organizationId || 
      req.user.organizationId ||
      req.headers['x-organization-id']

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      })
    }

    // Validate user has access to organization
    const hasAccess = await OrganizationService.hasAccess(req.user.userId, organizationId as string)
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to organization'
      })
    }

    // Get user's role in organization
    const role = await OrganizationService.getUserRole(req.user.userId, organizationId as string)
    
    req.organizationId = organizationId as string
    req.user.organizationId = organizationId as string
    req.user.role = role || 'member'

    logger.debug(`User ${req.user.userId} accessing org ${organizationId} as ${role}`)
    next()
  } catch (error) {
    logger.error('Organization validation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to validate organization access'
    })
  }
}

/**
 * Middleware to require specific role
 */
export const requireRole = (requiredRoles: string | string[]) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      return res.status(403).json({
        success: false,
        error: 'Role information not available'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Required role: ${roles.join(' or ')}. Current role: ${req.user.role}`
      })
    }

    next()
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.cookies?.['auth-token']

    if (token) {
      const decoded = JWTService.verifyToken(token)
      if (decoded) {
        req.user = decoded
      }
    }

    next()
  } catch (error) {
    logger.warn('Optional auth error:', error)
    next() // Continue without authentication
  }
}

// =============================================
// PASSPORT CONFIGURATION
// =============================================

import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'

// Google OAuth Strategy - only initialize if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const { prisma } = await import('../services/database.cloud-sql-only')
      
      // Find or create user
      let user = await prisma.user.findUnique({
        where: { googleId: profile.id }
      })

      if (!user) {
        // Check if user exists with same email
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.emails?.[0]?.value || '' }
        })

        if (existingUser) {
          // Link Google account to existing user
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: { 
              googleId: profile.id,
              lastLoginAt: new Date()
            }
          })
        } else {
          // Create new user
          user = await prisma.user.create({
            data: {
              email: profile.emails?.[0]?.value || '',
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value,
              googleId: profile.id,
              emailVerified: new Date(),
              lastLoginAt: new Date()
            }
          })
        }
      } else {
        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })
      }

      done(null, user)
    } catch (error) {
      logger.error('Google OAuth error:', error)
      done(error)
    }
  }))
} else {
  console.log('Google OAuth disabled - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
}

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWTService['secret']
}, async (payload: JWTPayload, done) => {
  try {
    const { prisma } = await import('../services/database.cloud-sql-only')
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (user) {
      done(null, user)
    } else {
      done(null, false)
    }
  } catch (error) {
    done(error, false)
  }
}))

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const { prisma } = await import('../services/database.cloud-sql-only')
    
    const user = await prisma.user.findUnique({
      where: { id }
    })
    
    done(null, user)
  } catch (error) {
    done(error)
  }
})

export { passport }