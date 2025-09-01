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

export function validateJournalEntry(lines: JournalLine[]): ValidationResult {
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
  const errors: string[] = [];

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

  // Check if debits equal credits (with tolerance for floating point precision)
  const difference = Math.abs(totalDebits - totalCredits);
  const tolerance = 0.01; // 1 cent tolerance

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

// Helper function to format currency amounts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Helper function to validate account types for specific transaction types
export function validateTransactionType(lines: JournalLine[], expectedType: 'income' | 'expense' | 'transfer'): ValidationResult {
  const baseValidation = validateJournalEntry(lines);
  if (!baseValidation.isBalanced) {
    return baseValidation;
  }

  // Additional validation based on transaction type
  switch (expectedType) {
    case 'income':
      // Income transactions should have income accounts credited
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
      // Expense transactions should have expense accounts debited
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
      // Transfer transactions should only involve asset/liability accounts
      // This is a simplified check - in practice you'd validate account types
      break;
  }

  return baseValidation;
}
