import { db } from "@/lib/db"
import { teams, creditLedger } from "@/lib/db/schema"
import { eq, sql, desc } from "drizzle-orm"

/**
 * Check the current credit balance for a team.
 */
export async function checkBalance(teamId: string): Promise<number> {
  const result = await db
    .select({ creditBalance: teams.creditBalance })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1)

  if (result.length === 0) {
    throw new Error(`Team not found: ${teamId}`)
  }

  return result[0].creditBalance
}

/**
 * Atomically deduct credits from a team's balance.
 * Uses WHERE credit_balance >= amount to prevent negative balances.
 * Returns success=false if insufficient credits.
 */
export async function deductCredits(
  teamId: string,
  amount: number,
  campaignId: string | null,
  description: string
): Promise<{ success: boolean; remainingBalance: number }> {
  if (amount <= 0) {
    throw new Error("Deduction amount must be positive")
  }

  // Atomic deduction: only succeeds if balance is sufficient
  const updateResult = await db
    .update(teams)
    .set({
      creditBalance: sql`${teams.creditBalance} - ${amount}`,
    })
    .where(
      sql`${teams.id} = ${teamId} AND ${teams.creditBalance} >= ${amount}`
    )
    .returning({ creditBalance: teams.creditBalance })

  if (updateResult.length === 0) {
    // Insufficient balance or team not found
    const currentBalance = await checkBalance(teamId)
    return { success: false, remainingBalance: currentBalance }
  }

  const newBalance = updateResult[0].creditBalance

  // Record the ledger entry
  await db.insert(creditLedger).values({
    teamId,
    amount: -amount,
    balanceAfter: newBalance,
    type: "deduction",
    campaignId,
    description,
  })

  return { success: true, remainingBalance: newBalance }
}

/**
 * Grant credits to a team's balance.
 * Used for subscription renewals, adjustments, and manual grants.
 */
export async function grantCredits(
  teamId: string,
  amount: number,
  description: string,
  stripeInvoiceId?: string
): Promise<{ newBalance: number }> {
  if (amount <= 0) {
    throw new Error("Grant amount must be positive")
  }

  const updateResult = await db
    .update(teams)
    .set({
      creditBalance: sql`${teams.creditBalance} + ${amount}`,
    })
    .where(eq(teams.id, teamId))
    .returning({ creditBalance: teams.creditBalance })

  if (updateResult.length === 0) {
    throw new Error(`Team not found: ${teamId}`)
  }

  const newBalance = updateResult[0].creditBalance

  // Record the ledger entry
  await db.insert(creditLedger).values({
    teamId,
    amount,
    balanceAfter: newBalance,
    type: "grant",
    description,
    stripeInvoiceId: stripeInvoiceId ?? null,
  })

  return { newBalance }
}

/**
 * Get credit transaction history for a team.
 * Returns most recent entries first.
 */
export async function getCreditHistory(
  teamId: string,
  limit: number = 50
): Promise<(typeof creditLedger.$inferSelect)[]> {
  return db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.teamId, teamId))
    .orderBy(desc(creditLedger.createdAt))
    .limit(limit)
}
