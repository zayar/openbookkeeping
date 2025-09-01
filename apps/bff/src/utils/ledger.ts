import { PrismaClient } from '@prisma/client'

export async function checkLedgerBalance(prisma: PrismaClient, journalId: string) {
  const entries = await prisma.journal_entries.findMany({ where: { journalId } })
  if (entries.length === 0) return { ok: false, error: 'No journal entries' }
  const totalDebit = entries.reduce((s, e) => s + Number(e.debitAmount), 0)
  const totalCredit = entries.reduce((s, e) => s + Number(e.creditAmount), 0)
  const isZero = Math.abs(totalDebit - totalCredit) < 0.0001
  return { ok: isZero, error: isZero ? undefined : `Out of balance (DR ${totalDebit} != CR ${totalCredit})` }
}

