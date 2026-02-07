// Auth pages use Supabase client; prevent static prerendering
export const dynamic = "force-dynamic"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page p-4">
      <div className="w-full max-w-md">
        <div className="rounded-radius-lg border border-border-subtle bg-bg-card p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
