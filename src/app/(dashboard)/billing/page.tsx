import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BillingContent } from "./billing-content"

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <BillingContent />
}
