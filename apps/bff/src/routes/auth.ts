import express from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import slugify from 'slugify'
import { 
  authenticate, 
  JWTService, 
  passport, 
  AuthenticatedRequest 
} from '../middleware/auth'
import { logger } from '../utils/logger'
import { prisma } from '../services/database.cloud-sql-only'
import { OrganizationService } from '../services/organizationService'
import { AuditService } from '../services/auditService'
import { oaClient } from '../services/oaClient'

const router = express.Router()

// =============================================
// VALIDATION SCHEMAS
// =============================================

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('organizationName').trim().isLength({ min: 2 }).withMessage('Organization name required')
]

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required')
]

const createOrganizationValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Organization name required'),
  body('description').optional().trim(),
  body('baseCurrency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
]

// =============================================
// GOOGLE OAUTH ROUTES
// =============================================

/**
 * Initiate Google OAuth
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

/**
 * Google OAuth callback
 */
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user as any
      
      // Generate JWT token
      const token = JWTService.generateToken({
        userId: user.id,
        email: user.email,
        name: user.name
      })

      // Get user's organizations
      const organizations = await OrganizationService.getUserOrganizations(user.id)

      // Log successful login
      logger.info(`User ${user.email} logged in via Google OAuth`)

      // Set cookie for session
      const isProd = process.env.NODE_ENV === 'production'
      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })

      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const redirectUrl = organizations.length > 0 
        ? `${frontendUrl}/dashboard`
        : `${frontendUrl}/onboarding`

      res.redirect(redirectUrl)
    } catch (error) {
      logger.error('Google OAuth callback error:', error)
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`)
    }
  }
)

// =============================================
// EMAIL/PASSWORD AUTHENTICATION
// =============================================

/**
 * Register new user with organization
 */
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { email, password, name, organizationName, organizationDescription } = req.body
    const { prisma } = await import('../services/database')

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        name,
        // Store password hash in accounts table (for compatibility with NextAuth)
        accounts: {
          create: {
            type: 'credentials',
            provider: 'credentials',
            providerAccountId: email,
            refresh_token: hashedPassword // Store hash here
          }
        }
      }
    })

    // Create organization slug
    const baseSlug = slugify(organizationName, { lower: true, strict: true })
    let slug = baseSlug
    let counter = 1

    // Ensure unique slug
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Create OA organization
    const oaResponse = await oaClient.createOrganization({
      name: organizationName,
      description: organizationDescription,
      currency: 'MMK'
    })

    if (!oaResponse.success) {
      // Clean up user if OA org creation failed
      await prisma.users.delete({ where: { id: user.id } })
      
      return res.status(500).json({
        success: false,
        error: `Failed to create organization: ${oaResponse.error}`
      })
    }

    // Create BFF organization
    const organization = await OrganizationService.createOrganization({
      name: organizationName,
      slug,
      description: organizationDescription,
      ownerId: user.id,
      oaOrganizationId: oaResponse.data.id,
      baseCurrency: 'MMK'
    })

    // Generate JWT token
    const token = JWTService.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: organization.id
    })

    // Log successful registration
    await AuditService.log({
      organizationId: organization.id,
      userId: user.id,
      action: 'REGISTER',
      resource: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      newValues: { email, name, organizationName }
    })

    logger.info(`New user registered: ${email} with organization: ${organizationName}`)

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        organization,
        token
      }
    })
  } catch (error: any) {
    logger.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    })
  }
})

/**
 * Login with email/password
 */
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { email, password } = req.body
    const { prisma } = await import('../services/database')

    // Find user with password hash
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        accounts: {
          where: {
            provider: 'credentials'
          }
        }
      }
    })

    if (!user || !user.accounts[0]) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      })
    }

    // Verify password
    const passwordHash = user.accounts[0].refresh_token // We stored hash here
    const isValidPassword = await bcrypt.compare(password, passwordHash || '')

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      })
    }

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Get user's organizations
    const organizations = await OrganizationService.getUserOrganizations(user.id)

    // Generate JWT token
    const token = JWTService.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      organizationId: organizations[0]?.id
    })

    logger.info(`User ${email} logged in successfully`)

    // Set cookie for session
    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        organizations,
        token
      }
    })
  } catch (error: any) {
    logger.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Login failed'
    })
  }
})

// =============================================
// AUTHENTICATED ROUTES
// =============================================

/**
 * Get current user info
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { prisma } = await import('../services/database')
    
    const user = await prisma.users.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        defaultCurrency: true,
        timezone: true,
        locale: true,
        createdAt: true,
        lastLoginAt: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Get user's organizations
    const organizations = await OrganizationService.getUserOrganizations(req.user!.userId)

    res.json({
      success: true,
      data: {
        user,
        organizations
      }
    })
  } catch (error) {
    logger.error('Get user error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    })
  }
})

/**
 * Update user profile
 */
router.put('/me', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('defaultCurrency').optional().isLength({ min: 3, max: 3 }),
  body('timezone').optional().trim(),
  body('locale').optional().trim()
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { name, defaultCurrency, timezone, locale } = req.body
    const { prisma } = await import('../services/database')

    const user = await prisma.users.update({
      where: { id: req.user!.userId },
      data: {
        ...(name && { name }),
        ...(defaultCurrency && { defaultCurrency }),
        ...(timezone && { timezone }),
        ...(locale && { locale })
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        defaultCurrency: true,
        timezone: true,
        locale: true
      }
    })

    logger.info(`User ${req.user!.userId} updated profile`)

    res.json({
      success: true,
      data: { user }
    })
  } catch (error) {
    logger.error('Update user error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    })
  }
})

/**
 * Create new organization
 */
router.post('/organizations', authenticate, createOrganizationValidation, async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { name, description, baseCurrency } = req.body
    const { prisma } = await import('../services/database')

    // Create organization slug
    const baseSlug = slugify(name, { lower: true, strict: true })
    let slug = baseSlug
    let counter = 1

    // Ensure unique slug
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Create OA organization
    const oaResponse = await oaClient.createOrganization({
      name,
      description,
      currency: baseCurrency || 'MMK'
    })

    if (!oaResponse.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to create organization: ${oaResponse.error}`
      })
    }

    // Create BFF organization
    const organization = await OrganizationService.createOrganization({
      name,
      slug,
      description,
      ownerId: req.user!.userId,
      oaOrganizationId: oaResponse.data.id,
      baseCurrency: baseCurrency || 'MMK'
    })

    // Log organization creation
    await AuditService.log({
      organizationId: organization.id,
      userId: req.user!.userId,
      action: 'CREATE',
      resource: 'organization',
      resourceId: organization.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      newValues: { name, slug, description, baseCurrency }
    })

    logger.info(`Organization created: ${name} by user ${req.user!.userId}`)

    res.status(201).json({
      success: true,
      data: organization
    })
  } catch (error) {
    logger.error('Create organization error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create organization'
    })
  }
})

/**
 * Switch organization (generate org-scoped token)
 */
router.post('/switch-organization', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.body

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      })
    }

    // Validate access
    const hasAccess = await OrganizationService.hasAccess(req.user!.userId, organizationId)
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to organization'
      })
    }

    // Get user's role
    const role = await OrganizationService.getUserRole(req.user!.userId, organizationId)

    // Generate organization-scoped token
    const token = JWTService.generateOrgToken(req.user!.userId, organizationId, role || 'member')

    res.json({
      success: true,
      data: {
        token,
        organizationId,
        role
      }
    })
  } catch (error) {
    logger.error('Switch organization error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to switch organization'
    })
  }
})

/**
 * Logout
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    logger.info(`User ${req.user!.userId} logged out`)
    // clear cookie
    res.clearCookie('auth-token', { path: '/' })

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    logger.error('Logout error:', error)
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    })
  }
})

/**
 * Refresh access token from cookie
 */
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.['auth-token']
    if (!token) {
      return res.status(401).json({ success: false, error: 'No session' })
    }

    const decoded = JWTService.verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Invalid session' })
    }

    // Re-issue token with same payload
    const { userId, email, name, organizationId } = decoded
    const newToken = JWTService.generateToken({ userId, email, name, organizationId })

    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('auth-token', newToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.json({ success: true })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Refresh failed' })
  }
})

export default router