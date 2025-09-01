# Ledger Invariants

## Overview

This document outlines the accounting invariants enforced by the BFF to ensure ACID-safe financial operations.

## Core Principle

**Every journal batch must sum to zero**: Total debits = Total credits.

## Invoice Confirmation Flow

When an invoice is confirmed (`POST /api/invoices/:id/confirm`):

1. **Accounts Receivable (DR)** = Total invoice amount
2. **Revenue (CR)** = Subtotal (before tax)
3. **Tax Payable (CR)** = Tax amount (if any)
4. **For tracked inventory items**:
   - **COGS (DR)** = Cost price × Quantity
   - **Inventory (CR)** = Cost price × Quantity

**Invariant Check**: `checkLedgerBalance()` verifies DR = CR before commit.

## Payment Recording Flow

When a payment is recorded (`POST /api/payments`):

1. **Bank/Cash Account (DR)** = Payment amount
2. **Accounts Receivable (CR)** = Payment amount

**Invariant Check**: Balance verified before updating invoice paid/balance amounts.

## Implementation

- `checkLedgerBalance(prisma, journalId)` sums all journal entries.
- Returns `{ ok: boolean, error?: string }`.
- On failure, transaction rolls back with 409 error.

## Opening Balances

Opening balances are **never mutated** by sales or payment operations. They remain separate in the `inventory_opening_balances` table.

## Enforcement

All financial operations use Prisma transactions (`prisma.$transaction`) with ledger balance verification. Any imbalance triggers immediate rollback.

---
Generated: ${new Date().toISOString()}
