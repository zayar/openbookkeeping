import { z } from 'zod';
export declare const AccountTypeSchema: z.ZodEnum<["asset", "liability", "equity", "income", "expense", "bank", "accounts_receivable", "accounts_payable", "other_current_asset", "fixed_asset", "other_asset", "other_current_liability", "long_term_liability", "cost_of_goods_sold", "other_income", "other_expense", "depreciation", "input_tax", "output_tax"]>;
export declare const AccountSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    code: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["asset", "liability", "equity", "income", "expense", "bank", "accounts_receivable", "accounts_payable", "other_current_asset", "fixed_asset", "other_asset", "other_current_liability", "long_term_liability", "cost_of_goods_sold", "other_income", "other_expense", "depreciation", "input_tax", "output_tax"]>;
    description: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodString>;
    currency: z.ZodDefault<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    debitBalance: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    organizationId: string;
    id: string;
    updatedAt: string;
    createdAt: string;
    type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
    code: string;
    isActive: boolean;
    currency: string;
    debitBalance: boolean;
    description?: string | undefined;
    parentId?: string | undefined;
}, {
    name: string;
    organizationId: string;
    id: string;
    updatedAt: string;
    createdAt: string;
    type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
    code: string;
    description?: string | undefined;
    isActive?: boolean | undefined;
    currency?: string | undefined;
    parentId?: string | undefined;
    debitBalance?: boolean | undefined;
}>;
export declare const CreateAccountRequestSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["asset", "liability", "equity", "income", "expense", "bank", "accounts_receivable", "accounts_payable", "other_current_asset", "fixed_asset", "other_asset", "other_current_liability", "long_term_liability", "cost_of_goods_sold", "other_income", "other_expense", "depreciation", "input_tax", "output_tax"]>;
    description: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodString>;
    currency: z.ZodDefault<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
    code: string;
    isActive: boolean;
    currency: string;
    description?: string | undefined;
    parentId?: string | undefined;
}, {
    name: string;
    type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
    code: string;
    description?: string | undefined;
    isActive?: boolean | undefined;
    currency?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const UpdateAccountRequestSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["asset", "liability", "equity", "income", "expense", "bank", "accounts_receivable", "accounts_payable", "other_current_asset", "fixed_asset", "other_asset", "other_current_liability", "long_term_liability", "cost_of_goods_sold", "other_income", "other_expense", "depreciation", "input_tax", "output_tax"]>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    parentId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    type?: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation" | undefined;
    code?: string | undefined;
    isActive?: boolean | undefined;
    currency?: string | undefined;
    parentId?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    type?: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation" | undefined;
    code?: string | undefined;
    isActive?: boolean | undefined;
    currency?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const ListAccountsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodOptional<z.ZodEnum<["asset", "liability", "equity", "income", "expense", "bank", "accounts_receivable", "accounts_payable", "other_current_asset", "fixed_asset", "other_asset", "other_current_liability", "long_term_liability", "cost_of_goods_sold", "other_income", "other_expense", "depreciation", "input_tax", "output_tax"]>>;
    search: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortBy: z.ZodDefault<z.ZodEnum<["code", "name", "type", "createdAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortBy: "name" | "createdAt" | "type" | "code";
    sortOrder: "asc" | "desc";
    cursor?: string | undefined;
    search?: string | undefined;
    offset?: number | undefined;
    type?: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation" | undefined;
    isActive?: boolean | undefined;
}, {
    cursor?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    type?: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation" | undefined;
    isActive?: boolean | undefined;
    page?: number | undefined;
    sortBy?: "name" | "createdAt" | "type" | "code" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const AccountResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodObject<{
        id: z.ZodString;
        organizationId: z.ZodString;
        code: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["asset", "liability", "equity", "income", "expense", "bank", "accounts_receivable", "accounts_payable", "other_current_asset", "fixed_asset", "other_asset", "other_current_liability", "long_term_liability", "cost_of_goods_sold", "other_income", "other_expense", "depreciation", "input_tax", "output_tax"]>;
        description: z.ZodOptional<z.ZodString>;
        parentId: z.ZodOptional<z.ZodString>;
        currency: z.ZodDefault<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
        debitBalance: z.ZodDefault<z.ZodBoolean>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        organizationId: string;
        id: string;
        updatedAt: string;
        createdAt: string;
        type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
        code: string;
        isActive: boolean;
        currency: string;
        debitBalance: boolean;
        description?: string | undefined;
        parentId?: string | undefined;
    }, {
        name: string;
        organizationId: string;
        id: string;
        updatedAt: string;
        createdAt: string;
        type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
        code: string;
        description?: string | undefined;
        isActive?: boolean | undefined;
        currency?: string | undefined;
        parentId?: string | undefined;
        debitBalance?: boolean | undefined;
    }>;
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
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: {
        name: string;
        organizationId: string;
        id: string;
        updatedAt: string;
        createdAt: string;
        type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
        code: string;
        isActive: boolean;
        currency: string;
        debitBalance: boolean;
        description?: string | undefined;
        parentId?: string | undefined;
    };
    success: true;
    requestId?: string | undefined;
    pagination?: {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    } | undefined;
}, {
    data: {
        name: string;
        organizationId: string;
        id: string;
        updatedAt: string;
        createdAt: string;
        type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
        code: string;
        description?: string | undefined;
        isActive?: boolean | undefined;
        currency?: string | undefined;
        parentId?: string | undefined;
        debitBalance?: boolean | undefined;
    };
    success: true;
    timestamp?: string | undefined;
    requestId?: string | undefined;
    pagination?: {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    } | undefined;
}>;
export declare const AccountsListResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        organizationId: z.ZodString;
        code: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["asset", "liability", "equity", "income", "expense", "bank", "accounts_receivable", "accounts_payable", "other_current_asset", "fixed_asset", "other_asset", "other_current_liability", "long_term_liability", "cost_of_goods_sold", "other_income", "other_expense", "depreciation", "input_tax", "output_tax"]>;
        description: z.ZodOptional<z.ZodString>;
        parentId: z.ZodOptional<z.ZodString>;
        currency: z.ZodDefault<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
        debitBalance: z.ZodDefault<z.ZodBoolean>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        organizationId: string;
        id: string;
        updatedAt: string;
        createdAt: string;
        type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
        code: string;
        isActive: boolean;
        currency: string;
        debitBalance: boolean;
        description?: string | undefined;
        parentId?: string | undefined;
    }, {
        name: string;
        organizationId: string;
        id: string;
        updatedAt: string;
        createdAt: string;
        type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
        code: string;
        description?: string | undefined;
        isActive?: boolean | undefined;
        currency?: string | undefined;
        parentId?: string | undefined;
        debitBalance?: boolean | undefined;
    }>, "many">;
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
    data: {
        name: string;
        organizationId: string;
        id: string;
        updatedAt: string;
        createdAt: string;
        type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
        code: string;
        isActive: boolean;
        currency: string;
        debitBalance: boolean;
        description?: string | undefined;
        parentId?: string | undefined;
    }[];
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
    data: {
        name: string;
        organizationId: string;
        id: string;
        updatedAt: string;
        createdAt: string;
        type: "other_asset" | "other_current_asset" | "bank" | "fixed_asset" | "accounts_receivable" | "input_tax" | "other_current_liability" | "accounts_payable" | "output_tax" | "equity" | "income" | "other_income" | "expense" | "cost_of_goods_sold" | "other_expense" | "asset" | "liability" | "long_term_liability" | "depreciation";
        code: string;
        description?: string | undefined;
        isActive?: boolean | undefined;
        currency?: string | undefined;
        parentId?: string | undefined;
        debitBalance?: boolean | undefined;
    }[];
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
export type Account = z.infer<typeof AccountSchema>;
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;
export type ListAccountsQuery = z.infer<typeof ListAccountsQuerySchema>;
export type AccountResponse = z.infer<typeof AccountResponseSchema>;
export type AccountsListResponse = z.infer<typeof AccountsListResponseSchema>;
//# sourceMappingURL=accounts.d.ts.map