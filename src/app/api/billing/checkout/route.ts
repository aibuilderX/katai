import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { stripeCustomers, teamMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { stripe } from "@/lib/stripe/client"
import { APP_URL } from "@/lib/stripe/config"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const body = await request.json()
  const { priceId } = body as { priceId: string }

  if (!priceId) {
    return NextResponse.json(
      { error: "プランを選択してください" },
      { status: 400 }
    )
  }

  // Find user's team
  const membership = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1)

  if (membership.length === 0) {
    return NextResponse.json(
      { error: "チームが見つかりません" },
      { status: 400 }
    )
  }

  // Look up or create Stripe customer
  let stripeCustomerId: string

  const existingCustomer = await db
    .select({ stripeCustomerId: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, user.id))
    .limit(1)

  if (existingCustomer.length > 0) {
    stripeCustomerId = existingCustomer[0].stripeCustomerId
  } else {
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabaseUserId: user.id },
    })
    stripeCustomerId = customer.id

    // Store mapping
    await db.insert(stripeCustomers).values({
      userId: user.id,
      stripeCustomerId: customer.id,
    })
  }

  // Create checkout session
  // Note: currency is set on the Price object in Stripe Dashboard (JPY is zero-decimal)
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/billing?canceled=true`,
    metadata: { supabaseUserId: user.id },
  })

  return NextResponse.json({ url: session.url })
}
