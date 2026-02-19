"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Strategy Accordion Component
 *
 * Displays AI strategic reasoning as plain-language Japanese conclusions.
 * Never exposes framework names (PAS, AIDA, Schwartz, LF8), classification
 * codes, or internal methodology labels.
 *
 * Placed between the campaign header and the tab bar on the campaign detail page.
 * Only renders for v1.1 pipeline campaigns that have strategicInsight data.
 *
 * Design: Steel-blue (#6B8FA3) accent, collapsed by default, smooth expand.
 * SuperDesign reference: draft fec4e0bf-302f-4b8e-ac60-bfd1caff9bb9
 */

interface StrategyAccordionProps {
  strategicInsight: {
    awarenessLevel: string
    lf8Desires: string[]
    copywritingFramework: string
    targetInsight: string
    creativeDirection: string
    keyMessages: string[]
    tonalGuidance: string
    summaryJa?: string
  }
}

// ===== Awareness level -> Japanese description =====

const AWARENESS_LABELS: Record<string, string> = {
  unaware:
    "\u307E\u3060\u8AB2\u984C\u306B\u6C17\u3065\u3044\u3066\u3044\u306A\u3044\u304A\u5BA2\u69D8\u3078\u306E\u30A2\u30D7\u30ED\u30FC\u30C1",
  problem_aware:
    "\u304A\u5BA2\u69D8\u306E\u8AB2\u984C\u8A8D\u8B58\u306B\u7126\u70B9\u3092\u5F53\u3066\u305F\u30A2\u30D7\u30ED\u30FC\u30C1",
  solution_aware:
    "\u89E3\u6C7A\u7B56\u3092\u63A2\u3057\u3066\u3044\u308B\u304A\u5BA2\u69D8\u3078\u306E\u63D0\u6848",
  product_aware:
    "\u88FD\u54C1\u3092\u77E5\u3063\u3066\u3044\u308B\u304A\u5BA2\u69D8\u3078\u306E\u5DEE\u5225\u5316",
  most_aware:
    "\u65E2\u5B58\u30D5\u30A1\u30F3\u3078\u306E\u7279\u5225\u30AA\u30D5\u30A1\u30FC",
}

// ===== LF8 desire -> Japanese plain-language =====

const LF8_LABELS: Record<string, string> = {
  survival:
    "\u751F\u6D3B\u306E\u5145\u5B9F\u3078\u306E\u6B32\u6C42",
  enjoyment_of_food:
    "\u98DF\u306E\u697D\u3057\u307F\u3078\u306E\u6B32\u6C42",
  freedom_from_fear:
    "\u5B89\u5FC3\u611F\u3078\u306E\u6B32\u6C42",
  sexual_companionship:
    "\u4EBA\u3068\u306E\u3064\u306A\u304C\u308A\u3078\u306E\u6B32\u6C42",
  comfortable_living:
    "\u5FEB\u9069\u306A\u66AE\u3089\u3057\u3078\u306E\u6B32\u6C42",
  superiority:
    "\u512A\u8D8A\u611F\u3078\u306E\u6B32\u6C42",
  care_for_loved_ones:
    "\u5927\u5207\u306A\u4EBA\u3092\u5B88\u308A\u305F\u3044\u6B32\u6C42",
  social_approval:
    "\u793E\u4F1A\u7684\u306A\u8A55\u4FA1\u3078\u306E\u6B32\u6C42",
}

/**
 * Map a desire string to a Japanese label.
 * Handles both exact key matches and fuzzy matching (lowercase, underscored).
 */
function getDesireLabel(desire: string): string {
  // Direct match
  if (LF8_LABELS[desire]) return LF8_LABELS[desire]

  // Normalize and try again
  const normalized = desire.toLowerCase().replace(/[\s-]/g, "_")
  if (LF8_LABELS[normalized]) return LF8_LABELS[normalized]

  // If it already looks like Japanese text, return as-is
  if (/[\u3000-\u9FFF]/.test(desire)) return desire

  // Fallback: return original
  return desire
}

export function StrategyAccordion({ strategicInsight }: StrategyAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Build the display lines in plain-language Japanese
  const lines: string[] = []

  // Line 1: summaryJa if available
  if (strategicInsight.summaryJa) {
    lines.push(strategicInsight.summaryJa)
  }

  // Line 2: Awareness-based approach description
  const awarenessLabel = AWARENESS_LABELS[strategicInsight.awarenessLevel]
  if (awarenessLabel) {
    lines.push(awarenessLabel)
  }

  // Line 3: Target insight + desires in natural Japanese
  if (strategicInsight.targetInsight) {
    const desireLabels = strategicInsight.lf8Desires
      .map(getDesireLabel)
      .filter(Boolean)

    if (desireLabels.length > 0) {
      lines.push(
        `${strategicInsight.targetInsight}\u3002${desireLabels.join("\u3001")}\u306B\u8A34\u6C42\u3057\u307E\u3059\u3002`
      )
    } else {
      lines.push(strategicInsight.targetInsight)
    }
  }

  // Line 4: Creative direction summary (if not already covered)
  if (strategicInsight.creativeDirection && lines.length < 3) {
    lines.push(strategicInsight.creativeDirection)
  }

  // Limit to 3 lines maximum
  const displayLines = lines.slice(0, 3)

  if (displayLines.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      {/* Header: steel-blue background, white text */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-90"
        style={{ backgroundColor: "#6B8FA3" }}
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-bold text-white">
          {"\u6226\u7565\u30B5\u30DE\u30EA\u30FC"}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-white transition-transform duration-300",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expandable content with smooth transition */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-border-subtle bg-bg-card px-4 py-3 space-y-1.5">
          {displayLines.map((line, index) => (
            <p
              key={index}
              className={cn(
                "text-sm text-text-secondary leading-relaxed",
                index === 0 && "font-medium text-text-primary"
              )}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
