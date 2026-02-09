import Stripe from "stripe"
import { stripe } from "@/lib/stripe/client"
import { db } from "@/lib/db"
import {
  stripeCustomers,
  subscriptions,
  teamMembers,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { grantCredits } from "@/lib/billing/credits"
import { getTierIdByPriceId } from "@/lib/stripe/config"
import { getTierById } from "@/lib/billing/tiers"

/**
 * Extract period start/end from a subscription's first item.
 * In Stripe v20, current_period_start/end moved from Subscription to SubscriptionItem.
 */
function getSubscriptionPeriod(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  return {
    periodStart: item ? new Date(item.current_period_start * 1000) : new Date(),
    periodEnd: item ? new Date(item.current_period_end * 1000) : new Date(),
  }
}

/**
 * Extract the subscription ID from an invoice's parent field.
 * In Stripe v20, invoice.subscription was replaced by invoice.parent.subscription_details.subscription.
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subRef = invoice.parent?.subscription_details?.subscription
  if (!subRef) return null
  return typeof subRef === "string" ? subRef : subRef.id
}

/**
 * Handle checkout.session.completed event.
 * Links Stripe customer to user, creates subscription record, grants initial credits.
 */
export async function handleCheckoutComplete(
  session: Stripe.Checkout.Session
) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const supabaseUserId = session.metadata?.supabaseUserId

  if (!supabaseUserId) {
    console.warn(
      "[stripe-sync] checkout.session.completed missing supabaseUserId in metadata:",
      session.id
    )
    return
  }

  // Upsert stripe customer mapping
  await db
    .insert(stripeCustomers)
    .values({
      userId: supabaseUserId,
      stripeCustomerId: customerId,
    })
    .onConflictDoNothing({ target: stripeCustomers.userId })

  // Fetch the full subscription from Stripe
  const stripeSubscription =
    await stripe.subscriptions.retrieve(subscriptionId)

  // Look up user's team
  const membership = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, supabaseUserId))
    .limit(1)

  if (membership.length === 0) {
    console.warn(
      "[stripe-sync] No team found for user:",
      supabaseUserId
    )
    return
  }

  const teamId = membership[0].teamId

  // Determine tier from price ID
  const priceId = stripeSubscription.items.data[0].price.id
  const tierId = getTierIdByPriceId(priceId)
  const tierConfig = tierId ? getTierById(tierId) : undefined

  // Get period dates from subscription item (Stripe v20)
  const { periodStart, periodEnd } = getSubscriptionPeriod(stripeSubscription)

  // Upsert subscription record
  await db
    .insert(subscriptions)
    .values({
      teamId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      tier: tierId || "starter",
      status: stripeSubscription.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.teamId,
      set: {
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        tier: tierId || "starter",
        status: stripeSubscription.status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
    })

  // Grant initial credits
  if (tierConfig) {
    await grantCredits(
      teamId,
      tierConfig.monthlyCredits,
      "Initial subscription credits",
      undefined
    )
  }
}

/**
 * Handle customer.subscription.updated and customer.subscription.deleted events.
 * Updates subscription tier, status, and period dates.
 */
export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  // Find existing subscription in DB
  const existing = await db
    .select()
    .from(subscriptions)
    .where(
      eq(subscriptions.stripeSubscriptionId, subscription.id)
    )
    .limit(1)

  if (existing.length === 0) {
    console.warn(
      "[stripe-sync] Subscription not found in DB:",
      subscription.id
    )
    return
  }

  // Determine new tier from price ID
  const priceId = subscription.items.data[0].price.id
  const tierId = getTierIdByPriceId(priceId)

  // Get period dates from subscription item (Stripe v20)
  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription)

  // Update subscription record
  await db
    .update(subscriptions)
    .set({
      tier: tierId || existing[0].tier,
      status: subscription.status,
      stripePriceId: priceId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(
      eq(subscriptions.stripeSubscriptionId, subscription.id)
    )
}

/**
 * Handle invoice.payment_succeeded event.
 * Grants monthly credits and updates subscription period.
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // In Stripe v20, subscription is accessed via parent.subscription_details
  const subscriptionId = getInvoiceSubscriptionId(invoice)

  if (!subscriptionId) {
    // One-off invoice, not subscription-related
    return
  }

  // Find subscription in DB
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1)

  if (existing.length === 0) {
    console.warn(
      "[stripe-sync] Subscription not found for invoice:",
      invoice.id
    )
    return
  }

  const sub = existing[0]

  // Get tier config to determine credit grant amount
  const tierConfig = getTierById(sub.tier)

  if (tierConfig) {
    await grantCredits(
      sub.teamId,
      tierConfig.monthlyCredits,
      "Monthly credit renewal",
      invoice.id
    )
  }

  // Update subscription period from invoice line items
  const lineItem = invoice.lines?.data?.[0]
  if (lineItem?.period) {
    await db
      .update(subscriptions)
      .set({
        currentPeriodStart: new Date(lineItem.period.start * 1000),
        currentPeriodEnd: new Date(lineItem.period.end * 1000),
        updatedAt: new Date(),
      })
      .where(
        eq(subscriptions.stripeSubscriptionId, subscriptionId)
      )
  }
}
