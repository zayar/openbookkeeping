"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireJwtAuth = requireJwtAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireJwtAuth(req, res, next) {
    try {
        const authHeader = req.get('Authorization') || '';
        const tokenFromHeader = authHeader.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length).trim()
            : undefined;
        const tokenFromCookie = req.cookies?.auth_token;
        const token = tokenFromHeader || tokenFromCookie;
        if (!token) {
            return res.status(401).json({ success: false, error: 'Unauthorized: missing token' });
        }
        const secret = process.env.JWT_SECRET || 'local-jwt-secret-key-change-in-production';
        const payload = jsonwebtoken_1.default.verify(token, secret);
        if (!payload || !payload.userId || !payload.organizationId) {
            return res.status(401).json({ success: false, error: 'Unauthorized: invalid token' });
        }
        req.auth = {
            userId: String(payload.userId),
            organizationId: String(payload.organizationId),
            email: payload.email,
            name: payload.name,
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
}
//# sourceMappingURL=jwtAuth.js.map