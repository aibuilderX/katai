"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CampaignProgress } from "@/lib/db/schema"

interface CampaignProgressState {
  progress: CampaignProgress | null
  status: string
  isGenerating: boolean
  isComplete: boolean
  isFailed: boolean
}

/**
 * Custom hook for real-time campaign progress via Supabase Realtime.
 *
 * Subscribes to postgres_changes on the campaigns table filtered by campaign ID.
 * Returns reactive progress state that updates in real-time.
 *
 * NOTE: Supabase Realtime requires the campaigns table to have REPLICA IDENTITY
 * set (e.g., `ALTER TABLE campaigns REPLICA IDENTITY FULL;`). Without this,
 * the realtime subscription will not include the changed column values.
 */
export function useCampaignProgress(
  campaignId: string,
  initialProgress: CampaignProgress | null,
  initialStatus: string
): CampaignProgressState {
  const [progress, setProgress] = useState<CampaignProgress | null>(
    initialProgress
  )
  const [status, setStatus] = useState(initialStatus)

  const isGenerating = status === "generating" || status === "pending"
  const isComplete = status === "complete"
  const isFailed = status === "failed"

  // Poll for updates as a fallback (in case Realtime is not configured)
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.campaign) {
          setProgress(data.campaign.progress)
          setStatus(data.campaign.status)
        }
      }
    } catch {
      // Silently fail polling
    }
  }, [campaignId])

  useEffect(() => {
    // Don't subscribe if already complete or failed
    if (!isGenerating) return

    const supabase = createClient()

    // Subscribe to Realtime postgres_changes
    const channel = supabase
      .channel(`campaign-progress-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          const newRecord = payload.new as {
            progress?: CampaignProgress
            status?: string
          }
          if (newRecord.progress) {
            setProgress(newRecord.progress)
          }
          if (newRecord.status) {
            setStatus(newRecord.status)
          }
        }
      )
      .subscribe()

    // Fallback polling every 5 seconds (in case Realtime is not configured)
    const pollInterval = setInterval(fetchLatest, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [campaignId, isGenerating, fetchLatest])

  return {
    progress,
    status,
    isGenerating,
    isComplete,
    isFailed,
  }
}
