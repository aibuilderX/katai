"use client"

import { KEIGO_REGISTERS } from "@/lib/constants/keigo"
import { cn } from "@/lib/utils"

interface KeigoOverrideProps {
  value: string
  defaultRegister: string
  onChange: (register: string) => void
}

export function KeigoOverride({
  value,
  defaultRegister,
  onChange,
}: KeigoOverrideProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {KEIGO_REGISTERS.map((register) => {
        const isSelected = value === register.id
        const isDefault = register.id === defaultRegister

        return (
          <button
            key={register.id}
            type="button"
            onClick={() => onChange(register.id)}
            className={cn(
              "relative flex flex-col gap-1.5 rounded-md border p-4 text-left transition-all duration-200",
              "hover:bg-bg-hover cursor-pointer",
              isSelected
                ? "border-vermillion bg-vermillion-subtle"
                : "border-border-subtle bg-bg-card"
            )}
          >
            {isDefault && (
              <span className="absolute -top-2.5 right-2 rounded-pill bg-warm-gold px-2 py-0.5 text-xs font-medium text-text-inverse">
                ブランドデフォルト
              </span>
            )}
            <span
              className={cn(
                "text-sm font-bold",
                isSelected ? "text-text-primary" : "text-text-secondary"
              )}
            >
              {register.nameJa}
            </span>
            <span className="text-xs text-text-muted">
              {register.descriptionJa}
            </span>
            <span
              className={cn(
                "mt-1 text-xs leading-relaxed",
                isSelected ? "text-text-secondary" : "text-text-muted"
              )}
            >
              {register.exampleText}
            </span>
          </button>
        )
      })}
    </div>
  )
}
