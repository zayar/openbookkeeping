import { Request, Response, NextFunction } from 'express';
export interface AuthContext {
    userId: string;
    organizationId: string;
    email?: string;
    name?: string;
}
declare global {
    namespace Express {
        interface Request {
            auth?: AuthContext;
        }
    }
}
export declare function requireJwtAuth(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=jwtAuth.d.ts.map