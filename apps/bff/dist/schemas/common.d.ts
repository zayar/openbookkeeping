import { z } from 'zod';
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    cursor?: string | undefined;
    offset?: number | undefined;
}, {
    cursor?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    page?: number | undefined;
}>;
export declare const CuidSchema: z.ZodString;
export declare const OrganizationIdSchema: z.ZodString;
export declare const UserIdSchema: z.ZodString;
export declare const CurrencySchema: z.ZodString;
export declare const DateStringSchema: z.ZodString;
export declare const DateRangeSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodAny>;
    timestamp: z.ZodDefault<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    error: string;
    timestamp: string;
    success: false;
    code?: string | undefined;
    requestId?: string | undefined;
    details?: any;
}, {
    error: string;
    success: false;
    timestamp?: string | undefined;
    code?: string | undefined;
    requestId?: string | undefined;
    details?: any;
}>;
export declare const SuccessResponseSchema: <T extends z.ZodType>(dataSchema: T) => z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: T;
    pagination: z.ZodOptional<z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>>;
    timestamp: z.ZodDefault<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodLiteral<true>;
    data: T;
    pagination: z.ZodOptional<z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>>;
    timestamp: z.ZodDefault<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodLiteral<true>;
    data: T;
    pagination: z.ZodOptional<z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>>;
    timestamp: z.ZodDefault<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare const PaginatedResponseSchema: <T extends z.ZodType>(itemSchema: T) => z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodArray<T, "many">;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>;
    timestamp: z.ZodDefault<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: T["_output"][];
    success: true;
    pagination: {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    requestId?: string | undefined;
}, {
    data: T["_input"][];
    success: true;
    pagination: {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    timestamp?: string | undefined;
    requestId?: string | undefined;
}>;
export declare const RequestContextSchema: z.ZodObject<{
    userId: z.ZodString;
    organizationId: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "member", "viewer"]>;
    requestId: z.ZodString;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    userId: string;
    organizationId: string;
    role: "member" | "owner" | "admin" | "viewer";
    requestId: string;
}, {
    timestamp: string;
    userId: string;
    organizationId: string;
    role: "member" | "owner" | "admin" | "viewer";
    requestId: string;
}>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type RequestContext = z.infer<typeof RequestContextSchema>;
//# sourceMappingURL=common.d.ts.map