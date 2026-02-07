import { WizardShell } from "@/components/brand/wizard-shell"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function NewBrandPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-text-muted">
        <Link
          href="/brands"
          className="hover:text-text-primary transition-colors"
        >
          ブランド
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text-secondary">新規作成</span>
      </nav>

      <WizardShell />
    </div>
  )
}
