"use client"

import { Loader2 } from "lucide-react"

interface RegenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  isLoading: boolean
}

export function RegenerateDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading,
}: RegenerateDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isLoading && onOpenChange(false)}
      />

      {/* Dialog card */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-lg border border-border bg-bg-card p-6 shadow-xl">
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-vermillion px-4 py-2 text-sm font-bold text-text-inverse transition-colors hover:bg-vermillion-hover disabled:opacity-50"
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            再生成する
          </button>
        </div>
      </div>
    </div>
  )
}
