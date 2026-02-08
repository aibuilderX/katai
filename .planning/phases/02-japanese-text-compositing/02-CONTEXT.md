# Phase 2: Japanese Text Compositing - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-side Japanese text overlay on AI-generated base images with correct typography, kinsoku shori line-breaking, keigo register control, and brand kit styling. Outputs composited images with text baked in. Multi-platform resizing and campaign kit packaging are Phase 3. Drag-and-drop text repositioning is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Text placement & layout
- AI auto-detects safe areas on the image and places text automatically
- System generates 3 layout alternatives per image (different text positions) — user picks their favorite
- 3 text elements composited: headline (キャッチコピー), tagline (サブコピー), and CTA (アクション)
- System omits tagline when the format doesn't warrant it
- Adaptive contrast handling — system analyzes the image region under text and applies the best readability treatment (semi-transparent backdrop, text stroke, or drop shadow) automatically

### Typography & line-breaking
- Supports both horizontal (yokogaki) and vertical (tategaki) text
- Strict JIS X 4051 kinsoku shori — full compliance with Japanese typesetting standard for professional-quality output
- Ratio-based font sizing hierarchy: headline = base size, tagline ~60%, CTA ~70%. Base size adapts to image dimensions, ratios stay locked
- No furigana support — not needed for ad creatives

### Brand kit application
- Brand font preferred, Noto Sans JP as fallback. System uses the font specified in brand profile; falls back to Noto Sans JP if unavailable
- Adaptive color with brand tint — readability first, brand fidelity second. CTA elements can use exact brand colors (they have their own backdrop)
- Fixed corner logo placement (default bottom-right) with consistent padding. Logo position stays stable across all variants in a campaign
- No logo uploaded = no logo on composite. Space reclaimed for image/text

### Compositing output
- Composite at base image resolution. Platform-specific sizing handled in Phase 3
- PNG output for composited images. Format optimization deferred to Phase 3

### Claude's Discretion
- Compositing timing (real-time vs async) — determine based on expected performance
- Storage strategy (flat images vs layered metadata) — determine based on re-rendering needs in later phases
- Exact safe-area detection approach
- Contrast treatment thresholds (when to use backdrop vs stroke vs shadow)
- Vertical text selection criteria (when to offer tategaki as an alternative)

</decisions>

<specifics>
## Specific Ideas

- "Let AI choose placement and give the ability to edit afterward" — AI auto-places, user picks from alternatives
- Competitive moat: strict kinsoku shori is the differentiator — this is what separates the product from competitors slapping text on images
- Campaign kit consistency: logo and sizing ratios should feel like they came from the same design system across all assets
- Adaptive approach preferred over rigid rules — the system should be smart about contrast, colors, and placement rather than one-size-fits-all

</specifics>

<deferred>
## Deferred Ideas

- Full drag-and-drop text repositioning editor — Phase 5 (Workflow & Intelligence)
- WebP/format optimization for delivery — Phase 3
- Platform-specific resizing — Phase 3

</deferred>

---

*Phase: 02-japanese-text-compositing*
*Context gathered: 2026-02-08*
