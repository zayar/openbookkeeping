export interface ChartAccount {
    name: string;
    code: string;
    type: 'other_asset' | 'other_current_asset' | 'cash' | 'bank' | 'fixed_asset' | 'accounts_receivable' | 'stock' | 'payment_clearing_account' | 'input_tax' | 'intangible_asset' | 'non_current_asset' | 'deferred_tax_asset' | 'other_current_liability' | 'credit_card' | 'non_current_liability' | 'other_liability' | 'accounts_payable' | 'overseas_tax_payable' | 'output_tax' | 'deferred_tax_liability' | 'equity' | 'income' | 'other_income' | 'expense' | 'cost_of_goods_sold' | 'other_expense';
    parentCode?: string;
    description?: string;
}
export declare const defaultChartOfAccounts: ChartAccount[];
//# sourceMappingURL=chartOfAccounts.d.ts.map