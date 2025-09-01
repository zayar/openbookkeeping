import { Request, Response, NextFunction } from 'express';
interface JWTPayload {
    userId: string;
    email: string;
    name?: string;
    organizationId?: string;
    role?: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
    organizationId?: string;
}
export declare class JWTService {
    private static secret;
    private static expiresIn;
    static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
    static verifyToken(token: string): JWTPayload | null;
    static generateOrgToken(userId: string, organizationId: string, role?: string): string;
}
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireOrganization: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireRole: (requiredRoles: string | string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
import passport from 'passport';
export { passport };
//# sourceMappingURL=auth.d.ts.map