import { cn } from "@/lib/utils"
import {
  APPROVAL_STATUS_LABELS,
  type ApprovalStatus,
} from "@/lib/workflows/approval"

interface ApprovalStatusBadgeProps {
  status: string | null | undefined
}

const colorMap: Record<string, string> = {
  gray: "bg-bg-hover text-text-muted",
  yellow: "bg-[#FBBF241A] text-warning",
  green: "bg-[#4ADE801A] text-success",
  red: "bg-[#EF44441A] text-error",
  orange: "bg-vermillion-subtle text-vermillion",
  purple: "bg-[#A855F71A] text-[#A855F7]",
}

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  if (!status || status === "none") {
    return null
  }

  const label = APPROVAL_STATUS_LABELS[status as ApprovalStatus]
  if (!label) {
    return null
  }

  const colorClass = colorMap[label.color] || colorMap.gray

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium",
        colorClass
      )}
    >
      {label.labelJa}
    </span>
  )
}
