"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface VideoPlayerProps {
  src: string
  aspectRatio?: string // e.g., "16:9", "9:16", "1:1"
  poster?: string // thumbnail image URL
  className?: string
}

/** Map aspect ratio string to Tailwind class. */
function getAspectClass(aspectRatio?: string): string {
  switch (aspectRatio) {
    case "16:9":
    case "1280:720":
      return "aspect-video"
    case "9:16":
    case "720:1280":
      return "aspect-[9/16]"
    case "1:1":
    case "1080:1080":
      return "aspect-square"
    default:
      return "aspect-video"
  }
}

/**
 * Reusable inline video player with aspect ratio preservation.
 * Renders an HTML5 video element with controls, constrained to max-h-[400px]
 * to prevent oversized vertical videos from dominating the page.
 */
export function VideoPlayer({
  src,
  aspectRatio,
  poster,
  className,
}: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-bg-surface",
        getAspectClass(aspectRatio),
        "max-h-[400px]",
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-bg-surface" />
      )}
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        onLoadedData={() => setIsLoading(false)}
        className="size-full object-contain"
      />
    </div>
  )
}
