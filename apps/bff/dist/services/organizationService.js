"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationService = void 0;
const database_cloud_sql_only_1 = require("./database.cloud-sql-only");
const logger_1 = require("../utils/logger");
class OrganizationService {
    static async getUserOrganizations(userId) {
        try {
            const memberships = await database_cloud_sql_only_1.prisma.organization_members.findMany({
                where: { userId },
                include: {
                    organizations: true
                }
            });
            return memberships.map(membership => ({
                id: membership.organizations.id,
                name: membership.organizations.name,
                slug: membership.organizations.slug,
                role: membership.role,
                status: membership.status,
                joinedAt: membership.createdAt
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to get user organizations:', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to get user organizations');
        }
    }
    static async createOrganization(data) {
        try {
            const organization = await database_cloud_sql_only_1.prisma.organizations.create({
                data: {
                    name: data.name,
                    slug: data.slug,
                    oaOrganizationId: data.oaOrganizationId,
                    baseCurrency: data.baseCurrency || 'USD',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            await database_cloud_sql_only_1.prisma.organization_members.create({
                data: {
                    organizationId: organization.id,
                    userId: data.ownerId,
                    role: 'owner',
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            logger_1.logger.info('Organization created successfully', {
                organizationId: organization.id,
                name: data.name,
                ownerId: data.ownerId
            });
            return organization;
        }
        catch (error) {
            logger_1.logger.error('Failed to create organization:', {
                data,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to create organization');
        }
    }
    static async hasAccess(userId, organizationId) {
        try {
            const membership = await database_cloud_sql_only_1.prisma.organization_members.findFirst({
                where: {
                    userId,
                    organizationId,
                    status: 'active'
                }
            });
            return !!membership;
        }
        catch (error) {
            logger_1.logger.error('Failed to check organization access:', {
                userId,
                organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    static async getUserRole(userId, organizationId) {
        try {
            const membership = await database_cloud_sql_only_1.prisma.organization_members.findFirst({
                where: {
                    userId,
                    organizationId,
                    status: 'active'
                }
            });
            return membership?.role || null;
        }
        catch (error) {
            logger_1.logger.error('Failed to get user role:', {
                userId,
                organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
}
exports.OrganizationService = OrganizationService;
//# sourceMappingURL=organizationService.js.map