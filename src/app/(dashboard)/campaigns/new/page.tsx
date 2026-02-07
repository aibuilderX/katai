import { BriefForm } from "@/components/brief/brief-form"

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-text-muted">
        <span className="hover:text-text-secondary cursor-pointer">
          キャンペーン
        </span>
        <span className="mx-2">/</span>
        <span className="text-text-primary">新規作成</span>
      </nav>

      {/* Title */}
      <h1 className="mb-8 text-2xl font-black text-text-primary">
        キャンペーンブリーフ
      </h1>

      {/* Brief Form */}
      <BriefForm />
    </div>
  )
}
