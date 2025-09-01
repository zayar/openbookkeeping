import { PrismaClient } from '@prisma/client'

export async function checkLedgerBalance(prisma: PrismaClient, journalId: string) {
  const journal = await prisma.journals.findUnique({ where: { id: journalId } })
  if (!journal) {
    return { ok: false, error: 'Journal not found' }
  }
  const isZero = journal.totalDebit.toString() === journal.totalCredit.toString()
  return { ok: isZero, error: isZero ? undefined : 'Journal batch not balanced' }
}

