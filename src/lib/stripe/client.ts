import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. " +
      "Get it from Stripe Dashboard -> Developers -> API keys -> Secret key. " +
      "Add it to your .env.local file."
  )
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
})
