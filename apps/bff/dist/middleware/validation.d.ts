import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export interface ValidatedRequest<TBody = any, TQuery = any, TParams = any> extends Request {
    body: TBody;
    query: TQuery;
    params: TParams;
    requestId: string;
    validatedAt: Date;
}
export declare function validateBody<T extends z.ZodType>(schema: T): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function validateQuery<T extends z.ZodType>(schema: T): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function validateParams<T extends z.ZodType>(schema: T): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function requestContext(req: Request, res: Response, next: NextFunction): void;
declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
            validatedAt?: Date;
        }
    }
}
//# sourceMappingURL=validation.d.ts.map