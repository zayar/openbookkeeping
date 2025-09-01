"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateJournalEntry = validateJournalEntry;
exports.formatCurrency = formatCurrency;
exports.validateTransactionType = validateTransactionType;
function validateJournalEntry(lines) {
    if (!Array.isArray(lines) || lines.length === 0) {
        return {
            isBalanced: false,
            totalDebits: 0,
            totalCredits: 0,
            error: 'Journal entry must have at least one line'
        };
    }
    if (lines.length < 2) {
        return {
            isBalanced: false,
            totalDebits: 0,
            totalCredits: 0,
            error: 'Journal entry must have at least two lines (debit and credit)'
        };
    }
    let totalDebits = 0;
    let totalCredits = 0;
    const errors = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.accountId) {
            errors.push(`Line ${i + 1}: Account ID is required`);
            continue;
        }
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        if (debit < 0 || credit < 0) {
            errors.push(`Line ${i + 1}: Amounts cannot be negative`);
            continue;
        }
        if (debit > 0 && credit > 0) {
            errors.push(`Line ${i + 1}: Cannot have both debit and credit amounts`);
            continue;
        }
        if (debit === 0 && credit === 0) {
            errors.push(`Line ${i + 1}: Must have either debit or credit amount`);
            continue;
        }
        totalDebits += debit;
        totalCredits += credit;
    }
    if (errors.length > 0) {
        return {
            isBalanced: false,
            totalDebits,
            totalCredits,
            error: errors.join('; ')
        };
    }
    const difference = Math.abs(totalDebits - totalCredits);
    const tolerance = 0.01;
    if (difference > tolerance) {
        return {
            isBalanced: false,
            totalDebits,
            totalCredits,
            error: `Debits (${totalDebits.toFixed(2)}) do not equal credits (${totalCredits.toFixed(2)})`
        };
    }
    return {
        isBalanced: true,
        totalDebits,
        totalCredits
    };
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}
function validateTransactionType(lines, expectedType) {
    const baseValidation = validateJournalEntry(lines);
    if (!baseValidation.isBalanced) {
        return baseValidation;
    }
    switch (expectedType) {
        case 'income':
            const hasIncomeCredit = lines.some(line => line.credit && line.credit > 0);
            if (!hasIncomeCredit) {
                return {
                    ...baseValidation,
                    isBalanced: false,
                    error: 'Income transaction must credit an income account'
                };
            }
            break;
        case 'expense':
            const hasExpenseDebit = lines.some(line => line.debit && line.debit > 0);
            if (!hasExpenseDebit) {
                return {
                    ...baseValidation,
                    isBalanced: false,
                    error: 'Expense transaction must debit an expense account'
                };
            }
            break;
        case 'transfer':
            break;
    }
    return baseValidation;
}
//# sourceMappingURL=journalValidation.js.map