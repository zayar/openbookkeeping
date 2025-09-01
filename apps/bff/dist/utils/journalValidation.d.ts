export interface JournalLine {
    accountId: string;
    debit?: number;
    credit?: number;
    description?: string;
}
export interface ValidationResult {
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    error?: string;
}
export declare function validateJournalEntry(lines: JournalLine[]): ValidationResult;
export declare function formatCurrency(amount: number): string;
export declare function validateTransactionType(lines: JournalLine[], expectedType: 'income' | 'expense' | 'transfer'): ValidationResult;
//# sourceMappingURL=journalValidation.d.ts.map