import { prisma } from './database.cloud-sql-only'
import { logger } from '../utils/logger'

// =============================================
// ORGANIZATION SERVICE - Cloud SQL Only
// =============================================

export class OrganizationService {
  
  /**
   * Get user's organizations
   */
  static async getUserOrganizations(userId: string) {
    try {
      const memberships = await prisma.organization_members.findMany({
        where: { userId },
        include: {
          organizations: true
        }
      })

      return memberships.map(membership => ({
        id: membership.organizations.id,
        name: membership.organizations.name,
        slug: membership.organizations.slug,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.createdAt
      }))
    } catch (error) {
      logger.error('Failed to get user organizations:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to get user organizations')
    }
  }

  /**
   * Create new organization
   */
  static async createOrganization(data: {
    name: string
    slug: string
    ownerId: string
    oaOrganizationId?: string
    baseCurrency?: string
  }) {
    try {
      const organization = await prisma.organizations.create({
        data: {
          name: data.name,
          slug: data.slug,
          oaOrganizationId: data.oaOrganizationId,
          baseCurrency: data.baseCurrency || 'USD',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Add owner as member
      await prisma.organization_members.create({
        data: {
          organizationId: organization.id,
          userId: data.ownerId,
          role: 'owner',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      logger.info('Organization created successfully', {
        organizationId: organization.id,
        name: data.name,
        ownerId: data.ownerId
      })

      return organization
    } catch (error) {
      logger.error('Failed to create organization:', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to create organization')
    }
  }

  /**
   * Check if user has access to organization
   */
  static async hasAccess(userId: string, organizationId: string): Promise<boolean> {
    try {
      const membership = await prisma.organization_members.findFirst({
        where: {
          userId,
          organizationId,
          status: 'active'
        }
      })

      return !!membership
    } catch (error) {
      logger.error('Failed to check organization access:', {
        userId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Get user's role in organization
   */
  static async getUserRole(userId: string, organizationId: string): Promise<string | null> {
    try {
      const membership = await prisma.organization_members.findFirst({
        where: {
          userId,
          organizationId,
          status: 'active'
        }
      })

      return membership?.role || null
    } catch (error) {
      logger.error('Failed to get user role:', {
        userId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }
}
