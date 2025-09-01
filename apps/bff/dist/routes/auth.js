"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const slugify_1 = __importDefault(require("slugify"));
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const organizationService_1 = require("../services/organizationService");
const auditService_1 = require("../services/auditService");
const oaClient_1 = require("../services/oaClient");
const router = express_1.default.Router();
const registerValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('organizationName').trim().isLength({ min: 2 }).withMessage('Organization name required')
];
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password required')
];
const createOrganizationValidation = [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2 }).withMessage('Organization name required'),
    (0, express_validator_1.body)('description').optional().trim(),
    (0, express_validator_1.body)('baseCurrency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
];
router.get('/google', auth_1.passport.authenticate('google', {
    scope: ['profile', 'email']
}));
router.get('/google/callback', auth_1.passport.authenticate('google', { session: false }), async (req, res) => {
    try {
        const user = req.user;
        const token = auth_1.JWTService.generateToken({
            userId: user.id,
            email: user.email,
            name: user.name
        });
        const organizations = await organizationService_1.OrganizationService.getUserOrganizations(user.id);
        logger_1.logger.info(`User ${user.email} logged in via Google OAuth`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = organizations.length > 0
            ? `${frontendUrl}/dashboard?token=${token}`
            : `${frontendUrl}/onboarding?token=${token}`;
        res.redirect(redirectUrl);
    }
    catch (error) {
        logger_1.logger.error('Google OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
});
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { email, password, name, organizationName, organizationDescription } = req.body;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../services/database')));
        const existingUser = await prisma.users.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User already exists with this email'
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma.users.create({
            data: {
                email,
                name,
                accounts: {
                    create: {
                        type: 'credentials',
                        provider: 'credentials',
                        providerAccountId: email,
                        refresh_token: hashedPassword
                    }
                }
            }
        });
        const baseSlug = (0, slugify_1.default)(organizationName, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;
        while (await prisma.organization.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const oaResponse = await oaClient_1.oaClient.createOrganization({
            name: organizationName,
            description: organizationDescription,
            currency: 'MMK'
        });
        if (!oaResponse.success) {
            await prisma.users.delete({ where: { id: user.id } });
            return res.status(500).json({
                success: false,
                error: `Failed to create organization: ${oaResponse.error}`
            });
        }
        const organization = await organizationService_1.OrganizationService.createOrganization({
            name: organizationName,
            slug,
            description: organizationDescription,
            ownerId: user.id,
            oaOrganizationId: oaResponse.data.id,
            baseCurrency: 'MMK'
        });
        const token = auth_1.JWTService.generateToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            organizationId: organization.id
        });
        await auditService_1.AuditService.log({
            organizationId: organization.id,
            userId: user.id,
            action: 'REGISTER',
            resource: 'user',
            resourceId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            newValues: { email, name, organizationName }
        });
        logger_1.logger.info(`New user registered: ${email} with organization: ${organizationName}`);
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
        });
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { email, password } = req.body;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../services/database')));
        const user = await prisma.users.findUnique({
            where: { email },
            include: {
                accounts: {
                    where: {
                        provider: 'credentials'
                    }
                }
            }
        });
        if (!user || !user.accounts[0]) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        const passwordHash = user.accounts[0].refresh_token;
        const isValidPassword = await bcryptjs_1.default.compare(password, passwordHash || '');
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        await prisma.users.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });
        const organizations = await organizationService_1.OrganizationService.getUserOrganizations(user.id);
        const token = auth_1.JWTService.generateToken({
            userId: user.id,
            email: user.email,
            name: user.name || undefined,
            organizationId: organizations[0]?.id
        });
        logger_1.logger.info(`User ${email} logged in successfully`);
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
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../services/database')));
        const user = await prisma.users.findUnique({
            where: { id: req.user.userId },
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
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const organizations = await organizationService_1.OrganizationService.getUserOrganizations(req.user.userId);
        res.json({
            success: true,
            data: {
                user,
                organizations
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
});
router.put('/me', auth_1.authenticate, [
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2 }),
    (0, express_validator_1.body)('defaultCurrency').optional().isLength({ min: 3, max: 3 }),
    (0, express_validator_1.body)('timezone').optional().trim(),
    (0, express_validator_1.body)('locale').optional().trim()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { name, defaultCurrency, timezone, locale } = req.body;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../services/database')));
        const user = await prisma.users.update({
            where: { id: req.user.userId },
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
        });
        logger_1.logger.info(`User ${req.user.userId} updated profile`);
        res.json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        logger_1.logger.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});
router.post('/organizations', auth_1.authenticate, createOrganizationValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { name, description, baseCurrency } = req.body;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../services/database')));
        const baseSlug = (0, slugify_1.default)(name, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;
        while (await prisma.organization.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const oaResponse = await oaClient_1.oaClient.createOrganization({
            name,
            description,
            currency: baseCurrency || 'MMK'
        });
        if (!oaResponse.success) {
            return res.status(500).json({
                success: false,
                error: `Failed to create organization: ${oaResponse.error}`
            });
        }
        const organization = await organizationService_1.OrganizationService.createOrganization({
            name,
            slug,
            description,
            ownerId: req.user.userId,
            oaOrganizationId: oaResponse.data.id,
            baseCurrency: baseCurrency || 'MMK'
        });
        await auditService_1.AuditService.log({
            organizationId: organization.id,
            userId: req.user.userId,
            action: 'CREATE',
            resource: 'organization',
            resourceId: organization.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            newValues: { name, slug, description, baseCurrency }
        });
        logger_1.logger.info(`Organization created: ${name} by user ${req.user.userId}`);
        res.status(201).json({
            success: true,
            data: organization
        });
    }
    catch (error) {
        logger_1.logger.error('Create organization error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create organization'
        });
    }
});
router.post('/switch-organization', auth_1.authenticate, async (req, res) => {
    try {
        const { organizationId } = req.body;
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                error: 'Organization ID required'
            });
        }
        const hasAccess = await organizationService_1.OrganizationService.hasAccess(req.user.userId, organizationId);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to organization'
            });
        }
        const role = await organizationService_1.OrganizationService.getUserRole(req.user.userId, organizationId);
        const token = auth_1.JWTService.generateOrgToken(req.user.userId, organizationId, role || 'member');
        res.json({
            success: true,
            data: {
                token,
                organizationId,
                role
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Switch organization error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to switch organization'
        });
    }
});
router.post('/logout', auth_1.authenticate, async (req, res) => {
    try {
        logger_1.logger.info(`User ${req.user.userId} logged out`);
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map