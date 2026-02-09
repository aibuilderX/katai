import Stripe from "stripe"
import { NextResponse } from "next/server"

export const maxDuration = 30
import { stripe } from "@/lib/stripe/client"
import {
  handleCheckoutComplete,
  handleSubscriptionChange,
  handleInvoicePaid,
} from "@/lib/stripe/sync"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error(
      "Stripe webhook signature verification failed:",
      err instanceof Error ? err.message : err
    )
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session
        )
        break
      case "customer.subscription.updated":
        await handleSubscriptionChange(
          event.data.object as Stripe.Subscription
        )
        break
      case "customer.subscription.deleted":
        await handleSubscriptionChange(
          event.data.object as Stripe.Subscription
        )
        break
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      default:
        // Unhandled event type -- acknowledge receipt
        break
    }
  } catch (err) {
    console.error(`Error handling webhook event ${event.type}:`, err)
    // Return 200 to prevent Stripe from retrying -- log for investigation
    return NextResponse.json({ received: true, error: "Handler failed" })
  }

  return NextResponse.json({ received: true })
}
