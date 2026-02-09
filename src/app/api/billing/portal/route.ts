import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { stripeCustomers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { stripe } from "@/lib/stripe/client"
import { APP_URL } from "@/lib/stripe/config"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  // Look up Stripe customer
  const existing = await db
    .select({ stripeCustomerId: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, user.id))
    .limit(1)

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "サブスクリプションが見つかりません" },
      { status: 400 }
    )
  }

  // Create customer portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: existing[0].stripeCustomerId,
    return_url: `${APP_URL}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
