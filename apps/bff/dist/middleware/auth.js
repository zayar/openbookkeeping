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
exports.passport = exports.optionalAuth = exports.requireRole = exports.requireOrganization = exports.authenticate = exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
class JWTService {
    static generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.secret, {
            expiresIn: this.expiresIn,
            issuer: 'openaccounting-bff',
            audience: 'openaccounting-app'
        });
    }
    static verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.secret);
            return decoded;
        }
        catch (error) {
            logger_1.logger.warn('Invalid JWT token:', error);
            return null;
        }
    }
    static generateOrgToken(userId, organizationId, role = 'member') {
        return jsonwebtoken_1.default.sign({ userId, organizationId, role }, this.secret, {
            expiresIn: '24h',
            issuer: 'openaccounting-bff',
            audience: 'openaccounting-app'
        });
    }
}
exports.JWTService = JWTService;
JWTService.secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
JWTService.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.slice(7)
            : req.cookies?.['auth-token'];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication token required'
            });
        }
        const decoded = JWTService.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication error:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};
exports.authenticate = authenticate;
const requireOrganization = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const organizationId = req.params.organizationId ||
            req.body.organizationId ||
            req.query.organizationId ||
            req.user.organizationId ||
            req.headers['x-organization-id'];
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                error: 'Organization ID required'
            });
        }
        const hasAccess = await OrganizationService.hasAccess(req.user.userId, organizationId);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to organization'
            });
        }
        const role = await OrganizationService.getUserRole(req.user.userId, organizationId);
        req.organizationId = organizationId;
        req.user.organizationId = organizationId;
        req.user.role = role || 'member';
        logger_1.logger.debug(`User ${req.user.userId} accessing org ${organizationId} as ${role}`);
        next();
    }
    catch (error) {
        logger_1.logger.error('Organization validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate organization access'
        });
    }
};
exports.requireOrganization = requireOrganization;
const requireRole = (requiredRoles) => {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return (req, res, next) => {
        if (!req.user?.role) {
            return res.status(403).json({
                success: false,
                error: 'Role information not available'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Required role: ${roles.join(' or ')}. Current role: ${req.user.role}`
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.slice(7)
            : req.cookies?.['auth-token'];
        if (token) {
            const decoded = JWTService.verifyToken(token);
            if (decoded) {
                req.user = decoded;
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.warn('Optional auth error:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
const passport_1 = __importDefault(require("passport"));
exports.passport = passport_1.default;
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_jwt_1 = require("passport-jwt");
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../services/database.cloud-sql-only')));
            let user = await prisma.user.findUnique({
                where: { googleId: profile.id }
            });
            if (!user) {
                const existingUser = await prisma.user.findUnique({
                    where: { email: profile.emails?.[0]?.value || '' }
                });
                if (existingUser) {
                    user = await prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            googleId: profile.id,
                            lastLoginAt: new Date()
                        }
                    });
                }
                else {
                    user = await prisma.user.create({
                        data: {
                            email: profile.emails?.[0]?.value || '',
                            name: profile.displayName,
                            avatar: profile.photos?.[0]?.value,
                            googleId: profile.id,
                            emailVerified: new Date(),
                            lastLoginAt: new Date()
                        }
                    });
                }
            }
            else {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() }
                });
            }
            done(null, user);
        }
        catch (error) {
            logger_1.logger.error('Google OAuth error:', error);
            done(error);
        }
    }));
}
else {
    console.log('Google OAuth disabled - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}
passport_1.default.use(new passport_jwt_1.Strategy({
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWTService['secret']
}, async (payload, done) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../services/database.cloud-sql-only')));
        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        });
        if (user) {
            done(null, user);
        }
        else {
            done(null, false);
        }
    }
    catch (error) {
        done(error, false);
    }
}));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../services/database.cloud-sql-only')));
        const user = await prisma.user.findUnique({
            where: { id }
        });
        done(null, user);
    }
    catch (error) {
        done(error);
    }
});
//# sourceMappingURL=auth.js.map