const { AuthorizationError, BusinessLogicError } = require('./error-handler')

/**
 * Role-Based Access Control (RBAC) System
 * Provides fine-grained permissions for different user roles
 */

// Define system roles and their hierarchical levels
const ROLES = {
  SUPER_ADMIN: { level: 100, name: 'super_admin' },
  OWNER: { level: 90, name: 'owner' }, // Organization owner
  ADMIN: { level: 80, name: 'admin' },
  MANAGER: { level: 60, name: 'manager' },
  ACCOUNTANT: { level: 50, name: 'accountant' },
  SALES_REP: { level: 40, name: 'sales_rep' },
  INVENTORY_CLERK: { level: 30, name: 'inventory_clerk' },
  VIEWER: { level: 20, name: 'viewer' },
  GUEST: { level: 10, name: 'guest' }
}

// Define permissions for different resources and actions
const PERMISSIONS = {
  // Organization Management
  'organizations:read': [ROLES.VIEWER.name, ROLES.GUEST.name],
  'organizations:write': [ROLES.OWNER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'organizations:delete': [ROLES.SUPER_ADMIN.name],
  
  // User Management
  'users:read': [ROLES.MANAGER.name, ROLES.OWNER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'users:write': [ROLES.OWNER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'users:delete': [ROLES.SUPER_ADMIN.name],
  'users:invite': [ROLES.OWNER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Financial Data
  'accounts:read': [ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'accounts:write': [ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'accounts:delete': [ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Journals and Transactions
  'journals:read': [ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'journals:write': [ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'journals:delete': [ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'journals:post': [ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Invoices
  'invoices:read': [ROLES.SALES_REP.name, ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'invoices:write': [ROLES.SALES_REP.name, ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'invoices:delete': [ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'invoices:confirm': [ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Customers
  'customers:read': [ROLES.SALES_REP.name, ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'customers:write': [ROLES.SALES_REP.name, ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'customers:delete': [ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Vendors
  'vendors:read': [ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'vendors:write': [ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'vendors:delete': [ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Inventory Management
  'inventory:read': [ROLES.INVENTORY_CLERK.name, ROLES.SALES_REP.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'inventory:write': [ROLES.INVENTORY_CLERK.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'inventory:transfer': [ROLES.INVENTORY_CLERK.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'inventory:adjust': [ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Products/Items
  'items:read': [ROLES.INVENTORY_CLERK.name, ROLES.SALES_REP.name, ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'items:write': [ROLES.INVENTORY_CLERK.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'items:delete': [ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Warehouses
  'warehouses:read': [ROLES.INVENTORY_CLERK.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'warehouses:write': [ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'warehouses:delete': [ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Reports
  'reports:financial': [ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'reports:inventory': [ROLES.INVENTORY_CLERK.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'reports:sales': [ROLES.SALES_REP.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'reports:executive': [ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // System Settings
  'settings:read': [ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'settings:write': [ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'settings:fiscal_year': [ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Audit Logs
  'audit:read': [ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'audit:export': [ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Opening Balances
  'opening_balances:read': [ROLES.ACCOUNTANT.name, ROLES.MANAGER.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'opening_balances:write': [ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  
  // Year-end Closing
  'year_end:read': [ROLES.ACCOUNTANT.name, ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name],
  'year_end:execute': [ROLES.ADMIN.name, ROLES.SUPER_ADMIN.name]
}

/**
 * Get user's role from organization membership
 */
async function getUserRole(userId, organizationId, prisma) {
  const membership = await prisma.organization_members.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  })
  
  return membership?.role || ROLES.GUEST.name
}

/**
 * Check if user has specific permission
 */
function hasPermission(userRole, permission) {
  const allowedRoles = PERMISSIONS[permission]
  if (!allowedRoles) {
    return false
  }
  
  // Check direct permission
  if (allowedRoles.includes(userRole)) {
    return true
  }
  
  // Check hierarchical permissions (higher roles inherit lower role permissions)
  const userRoleLevel = Object.values(ROLES).find(r => r.name === userRole)?.level || 0
  
  for (const allowedRole of allowedRoles) {
    const allowedRoleLevel = Object.values(ROLES).find(r => r.name === allowedRole)?.level || 0
    if (userRoleLevel >= allowedRoleLevel) {
      return true
    }
  }
  
  return false
}

/**
 * Middleware factory for checking permissions
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const { userId, organizationId } = req.auth || {}
      
      if (!userId || !organizationId) {
        throw new AuthorizationError('Authentication required')
      }
      
      // Get user's role in this organization
      const { PrismaClient } = require('@prisma/client')
      const prisma = req.prisma || new PrismaClient()
      const userRole = await getUserRole(userId, organizationId, prisma)
      
      // Check permission
      if (!hasPermission(userRole, permission)) {
        throw new AuthorizationError(`Insufficient permissions. Required: ${permission}`)
      }
      
      // Add role to request for further use
      req.userRole = userRole
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware for checking multiple permissions (OR logic)
 */
function requireAnyPermission(...permissions) {
  return async (req, res, next) => {
    try {
      const { userId, organizationId } = req.auth || {}
      
      if (!userId || !organizationId) {
        throw new AuthorizationError('Authentication required')
      }
      
      const { PrismaClient } = require('@prisma/client')
      const prisma = req.prisma || new PrismaClient()
      const userRole = await getUserRole(userId, organizationId, prisma)
      
      // Check if user has any of the required permissions
      const hasAnyPermission = permissions.some(permission => hasPermission(userRole, permission))
      
      if (!hasAnyPermission) {
        throw new AuthorizationError(`Insufficient permissions. Required one of: ${permissions.join(', ')}`)
      }
      
      req.userRole = userRole
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware for role-based access (minimum role level required)
 */
function requireRole(minimumRole) {
  return async (req, res, next) => {
    try {
      const { userId, organizationId } = req.auth || {}
      
      if (!userId || !organizationId) {
        throw new AuthorizationError('Authentication required')
      }
      
      const { PrismaClient } = require('@prisma/client')
      const prisma = req.prisma || new PrismaClient()
      const userRole = await getUserRole(userId, organizationId, prisma)
      const userRoleLevel = Object.values(ROLES).find(r => r.name === userRole)?.level || 0
      const requiredRoleLevel = Object.values(ROLES).find(r => r.name === minimumRole)?.level || 100
      
      if (userRoleLevel < requiredRoleLevel) {
        throw new AuthorizationError(`Insufficient role level. Required: ${minimumRole} or higher`)
      }
      
      req.userRole = userRole
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Check if user can access specific resource (for resource-level permissions)
 */
async function canAccessResource(userId, organizationId, resourceType, resourceId, action, prisma) {
  const userRole = await getUserRole(userId, organizationId, prisma)
  const permission = `${resourceType}:${action}`
  
  // Check basic permission first
  if (!hasPermission(userRole, permission)) {
    return false
  }
  
  // Additional resource-specific checks can be added here
  // For example, sales reps can only access their own customers
  if (resourceType === 'customers' && userRole === ROLES.SALES_REP.name) {
    // Check if customer is assigned to this sales rep
    const customer = await prisma.customers.findUnique({
      where: { id: resourceId },
      select: { salespersonId: true }
    })
    
    if (customer?.salespersonId && customer.salespersonId !== userId) {
      return false
    }
  }
  
  // Warehouse-specific permissions
  if (resourceType === 'warehouses' && action === 'write') {
    const hasWarehousePermission = await prisma.warehouse_permissions.findFirst({
      where: {
        userId,
        warehouseId: resourceId,
        permission: 'write'
      }
    })
    
    if (!hasWarehousePermission && !hasPermission(userRole, 'warehouses:write')) {
      return false
    }
  }
  
  return true
}

/**
 * Get user's effective permissions
 */
function getUserPermissions(userRole) {
  const userPermissions = []
  
  for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
    if (hasPermission(userRole, permission)) {
      userPermissions.push(permission)
    }
  }
  
  return userPermissions
}

/**
 * Middleware to add user permissions to request
 */
function addUserPermissions() {
  return async (req, res, next) => {
    try {
      if (req.auth?.userId && req.auth?.organizationId) {
        const { PrismaClient } = require('@prisma/client')
        const prisma = req.prisma || new PrismaClient()
        const userRole = await getUserRole(req.auth.userId, req.auth.organizationId, prisma)
        req.userRole = userRole
        req.userPermissions = getUserPermissions(userRole)
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

module.exports = {
  ROLES,
  PERMISSIONS,
  getUserRole,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  requireRole,
  canAccessResource,
  getUserPermissions,
  addUserPermissions
}
