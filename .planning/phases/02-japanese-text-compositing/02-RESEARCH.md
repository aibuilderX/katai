# Phase 2: Japanese Text Compositing - Research

**Researched:** 2026-02-08
**Domain:** Server-side Japanese text compositing on AI-generated images with Sharp/Pango, kinsoku shori, vertical text, brand kit styling, and AI-driven layout
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Text placement & layout
- AI auto-detects safe areas on the image and places text automatically
- System generates 3 layout alternatives per image (different text positions) -- user picks their favorite
- 3 text elements composited: headline (catch copy), tagline (sub copy), and CTA (action)
- System omits tagline when the format doesn't warrant it
- Adaptive contrast handling -- system analyzes the image region under text and applies the best readability treatment (semi-transparent backdrop, text stroke, or drop shadow) automatically

#### Typography & line-breaking
- Supports both horizontal (yokogaki) and vertical (tategaki) text
- Strict JIS X 4051 kinsoku shori -- full compliance with Japanese typesetting standard for professional-quality output
- Ratio-based font sizing hierarchy: headline = base size, tagline ~60%, CTA ~70%. Base size adapts to image dimensions, ratios stay locked
- No furigana support -- not needed for ad creatives

#### Brand kit application
- Brand font preferred, Noto Sans JP as fallback. System uses the font specified in brand profile; falls back to Noto Sans JP if unavailable
- Adaptive color with brand tint -- readability first, brand fidelity second. CTA elements can use exact brand colors (they have their own backdrop)
- Fixed corner logo placement (default bottom-right) with consistent padding. Logo position stays stable across all variants in a campaign
- No logo uploaded = no logo on composite. Space reclaimed for image/text

#### Compositing output
- Composite at base image resolution. Platform-specific sizing handled in Phase 3
- PNG output for composited images. Format optimization deferred to Phase 3

### Claude's Discretion
- Compositing timing (real-time vs async) -- determine based on expected performance
- Storage strategy (flat images vs layered metadata) -- determine based on re-rendering needs in later phases
- Exact safe-area detection approach
- Contrast treatment thresholds (when to use backdrop vs stroke vs shadow)
- Vertical text selection criteria (when to offer tategaki as an alternative)

### Deferred Ideas (OUT OF SCOPE)
- Full drag-and-drop text repositioning editor -- Phase 5 (Workflow & Intelligence)
- WebP/format optimization for delivery -- Phase 3
- Platform-specific resizing -- Phase 3
</user_constraints>

---

## Summary

Phase 2 adds server-side Japanese text compositing onto AI-generated base images. The core technical challenge spans five domains: (1) image compositing with Sharp's built-in Pango-based text rendering and SVG overlay pipeline, (2) JIS X 4051 kinsoku shori line-breaking implementation using BudouX for phrase segmentation combined with custom prohibited-character enforcement, (3) AI-driven safe area detection using Claude Vision API with structured output for layout coordinates, (4) vertical text (tategaki) rendering via Pango gravity attributes or character-by-character SVG compositing, and (5) adaptive contrast analysis using Sharp's region statistics to select readability treatments.

The project already has Sharp 0.34.5 installed (used for image processing in Phase 1). Sharp's text rendering relies on libvips which wraps Pango for text layout and librsvg for SVG rendering. This gives us two compositing approaches: (a) Sharp's native `input.text` with Pango markup for horizontal text with font/color/size control, and (b) SVG buffer overlays composited via `sharp.composite()` for more complex layouts including backgrounds, shadows, and positioning control. The SVG approach is more flexible and is the recommended primary method, with `input.text` used for simpler single-text-element cases.

For layout intelligence, the recommended approach is to use Claude Vision API to analyze each base image and return structured layout coordinates (safe zones, text positions, contrast assessment) via tool use. This aligns with the existing Claude API integration pattern in the codebase. Claude can analyze image content, identify negative space, and suggest multiple layout alternatives -- directly satisfying the requirement for 3 layout variants per image.

**Primary recommendation:** Use Sharp's SVG composite pipeline for text rendering, BudouX + custom kinsoku rules for line breaking, Claude Vision for layout intelligence, and store both flat composited PNGs and layout metadata JSON for Phase 5 re-rendering support.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Sharp | 0.34.5 (already installed) | Image compositing, text rendering via Pango/SVG | Already in project; libvips-backed; supports composite(), input.text, SVG overlays, region stats |
| BudouX | ^0.6.x (latest) | Japanese phrase segmentation for line breaking | Google-maintained; 15KB ML model; no external API dependency; npm package actively maintained |
| @anthropic-ai/sdk | ^0.73.0 (already installed) | Claude Vision for layout intelligence | Already in project; supports image input (base64/URL); tool_use for structured coordinate output |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fontsource/noto-sans-jp | latest | Noto Sans JP font files for server-side rendering | Bundled font files for Sharp/Pango text rendering without system font dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sharp SVG composite | node-canvas | node-canvas requires system Cairo library; Sharp already installed; SVG approach is more portable |
| Sharp SVG composite | Puppeteer/headless Chrome | Much heavier; 200MB+ dependency; slower; overkill for text overlay |
| BudouX | kuromoji (morphological analyzer) | kuromoji is 20MB+ dictionary; BudouX is 15KB; BudouX is purpose-built for line breaking |
| BudouX | Manual kinsoku-only (no phrase segmentation) | Character-level kinsoku without semantic breaks produces ugly line breaks in Japanese |
| Claude Vision for layout | OpenCV saliency detection | Requires native C++ bindings; Claude already in stack; Claude understands ad composition semantics |

**Installation:**
```bash
pnpm add budoux @fontsource/noto-sans-jp
```

No additional system dependencies needed -- Sharp already bundles libvips with Pango and librsvg support.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── compositing/
│   │   ├── index.ts              # Main compositing pipeline orchestrator
│   │   ├── layout-engine.ts      # Claude Vision layout analysis + coordinate generation
│   │   ├── text-renderer.ts      # SVG text rendering with Pango markup
│   │   ├── kinsoku.ts            # Kinsoku shori + BudouX line breaking
│   │   ├── contrast-analyzer.ts  # Image region luminance analysis + treatment selection
│   │   ├── vertical-text.ts      # Tategaki (vertical text) renderer
│   │   ├── logo-placer.ts        # Logo overlay with fixed corner placement
│   │   └── types.ts              # Compositing type definitions
│   ├── ai/
│   │   ├── prompts/
│   │   │   └── layout-analysis.ts  # Claude Vision prompt for safe area detection
│   │   └── ...existing...
│   └── constants/
│       ├── kinsoku-chars.ts      # JIS X 4051 prohibited character sets
│       └── ...existing...
├── types/
│   └── compositing.ts            # Layout, text element, treatment types
└── app/
    └── api/
        └── campaigns/
            └── [id]/
                └── composite/
                    └── route.ts   # API endpoint to trigger/retrieve composites
```

### Pattern 1: SVG Text Overlay Compositing with Sharp

**What:** Render Japanese text as SVG buffers and composite them onto base images using Sharp's composite() method.
**When to use:** All text compositing operations (headline, tagline, CTA).

```typescript
// Source: Sharp composite API docs + verified via Context7
import sharp from 'sharp';

interface TextElement {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  maxWidth: number;
  align: 'left' | 'center' | 'right';
}

function buildTextSvg(element: TextElement, treatment: ContrastTreatment): Buffer {
  const { text, fontSize, fontFamily, color, maxWidth, align } = element;

  // Build SVG with text and readability treatment
  let svgContent = '';

  if (treatment.type === 'backdrop') {
    svgContent += `<rect x="0" y="0" width="${maxWidth + 40}" height="${fontSize * 2 + 20}"
      rx="8" ry="8" fill="rgba(0,0,0,${treatment.opacity})" />`;
  }

  const textAnchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const textX = align === 'center' ? maxWidth / 2 : align === 'right' ? maxWidth : 20;

  // Text with optional stroke for readability
  if (treatment.type === 'stroke') {
    svgContent += `<text x="${textX}" y="${fontSize + 10}"
      font-family="${fontFamily}" font-size="${fontSize}"
      text-anchor="${textAnchor}" fill="${color}"
      stroke="${treatment.strokeColor}" stroke-width="${treatment.strokeWidth}"
      paint-order="stroke">${escapeXml(text)}</text>`;
  } else {
    svgContent += `<text x="${textX}" y="${fontSize + 10}"
      font-family="${fontFamily}" font-size="${fontSize}"
      text-anchor="${textAnchor}" fill="${color}">${escapeXml(text)}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    width="${maxWidth + 40}" height="${fontSize * 2 + 20}">
    ${svgContent}
  </svg>`;

  return Buffer.from(svg);
}

async function compositeTextOnImage(
  baseImageBuffer: Buffer,
  elements: TextElement[],
  treatments: ContrastTreatment[]
): Promise<Buffer> {
  const overlays = elements.map((el, i) => ({
    input: buildTextSvg(el, treatments[i]),
    top: el.y,
    left: el.x,
  }));

  return sharp(baseImageBuffer)
    .composite(overlays)
    .png()
    .toBuffer();
}
```

### Pattern 2: Sharp input.text with Pango Markup (Alternative)

**What:** Use Sharp's built-in text rendering via Pango markup for simpler text elements.
**When to use:** Single text elements where SVG complexity is not needed.

```typescript
// Source: Sharp API docs (Context7 verified)
import sharp from 'sharp';

async function renderTextWithPango(
  text: string,
  font: string,
  fontSize: number,
  color: string,
  maxWidth: number
): Promise<Buffer> {
  // Pango markup supports <span> attributes for color, font, size
  const pangoText = `<span foreground="${color}" font_family="${font}"
    font_size="${Math.round(fontSize * 1024)}">` +
    escapeXml(text) + '</span>';

  return sharp({
    text: {
      text: pangoText,
      font: font,
      width: maxWidth,
      rgba: true,
      dpi: 150,
      wrap: 'word-char', // Important for CJK: falls back to char-level wrap
    }
  }).png().toBuffer();
}
```

### Pattern 3: Claude Vision for Layout Intelligence

**What:** Send base image to Claude Vision API to analyze image content, detect safe areas, and return structured layout coordinates for 3 alternative placements.
**When to use:** Before compositing -- determines where text elements should be placed.

```typescript
// Source: Claude Vision API docs (verified)
import Anthropic from '@anthropic-ai/sdk';

interface LayoutAlternative {
  id: string; // 'A' | 'B' | 'C'
  headline: { x: number; y: number; maxWidth: number; align: string };
  tagline: { x: number; y: number; maxWidth: number; align: string } | null;
  cta: { x: number; y: number; maxWidth: number; align: string };
  logo: { x: number; y: number };
  orientation: 'horizontal' | 'vertical'; // yokogaki or tategaki
  contrastZones: Array<{
    region: { x: number; y: number; width: number; height: number };
    brightness: 'light' | 'dark' | 'mixed';
  }>;
}

const LAYOUT_ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'deliver_layout_alternatives',
  description: 'Analyze the image and return 3 layout alternatives for text placement',
  input_schema: {
    type: 'object' as const,
    properties: {
      alternatives: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            headline: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                maxWidth: { type: 'number' },
                align: { type: 'string', enum: ['left', 'center', 'right'] },
              },
              required: ['x', 'y', 'maxWidth', 'align'],
            },
            tagline: { /* similar structure, nullable */ },
            cta: { /* similar structure */ },
            orientation: { type: 'string', enum: ['horizontal', 'vertical'] },
            contrastZones: { /* array of region + brightness */ },
          },
          required: ['id', 'headline', 'cta', 'orientation', 'contrastZones'],
        },
        minItems: 3,
        maxItems: 3,
      },
      imageDescription: { type: 'string' },
      safeAreas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
      },
    },
    required: ['alternatives', 'imageDescription', 'safeAreas'],
  },
};

async function analyzeImageLayout(
  imageBuffer: Buffer,
  imageWidth: number,
  imageHeight: number,
  hasTagline: boolean,
  hasLogo: boolean
): Promise<LayoutAlternative[]> {
  const base64Image = imageBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: base64Image },
        },
        {
          type: 'text',
          text: `Analyze this ${imageWidth}x${imageHeight}px advertising image for text placement.

Return 3 layout alternatives with coordinates in pixels:
- Headline: primary text element (largest)
- ${hasTagline ? 'Tagline: secondary text element (smaller)' : 'No tagline needed for this format'}
- CTA: call-to-action button/text
- ${hasLogo ? 'Logo: bottom-right corner with 40px padding' : 'No logo'}

Rules:
- Place text in areas with low visual complexity (sky, gradients, solid areas)
- Avoid covering the main subject of the image
- Each alternative should use a DIFFERENT region of the image
- At least one alternative should use vertical (tategaki) text orientation if the image has a suitable vertical safe area
- All coordinates must be within image bounds (0-${imageWidth} x, 0-${imageHeight} y)
- Indicate whether each text region sits over a light or dark area

Use the deliver_layout_alternatives tool.`,
        },
      ],
    }],
    tools: [LAYOUT_ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: 'deliver_layout_alternatives' },
  });

  // Extract structured result
  const toolBlock = response.content.find(b => b.type === 'tool_use');
  return (toolBlock?.input as { alternatives: LayoutAlternative[] }).alternatives;
}
```

### Pattern 4: Region-Based Contrast Analysis with Sharp

**What:** Extract pixel statistics from specific image regions to determine optimal text readability treatment.
**When to use:** After layout coordinates are determined, before rendering text.

```typescript
// Source: Sharp stats() API (Context7 verified)
import sharp from 'sharp';

interface ContrastTreatment {
  type: 'backdrop' | 'stroke' | 'shadow';
  opacity?: number;       // for backdrop
  strokeColor?: string;   // for stroke
  strokeWidth?: number;   // for stroke
  shadowOffset?: number;  // for shadow
  shadowBlur?: number;    // for shadow
}

async function analyzeRegionContrast(
  imageBuffer: Buffer,
  region: { x: number; y: number; width: number; height: number }
): Promise<{ luminance: number; variance: number }> {
  // Extract the region under where text will be placed
  const regionBuffer = await sharp(imageBuffer)
    .extract({
      left: Math.max(0, region.x),
      top: Math.max(0, region.y),
      width: region.width,
      height: region.height,
    })
    .toBuffer();

  const stats = await sharp(regionBuffer).stats();

  // Calculate relative luminance from RGB channels
  // WCAG formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
  const rMean = stats.channels[0].mean / 255;
  const gMean = stats.channels[1].mean / 255;
  const bMean = stats.channels[2].mean / 255;
  const luminance = 0.2126 * rMean + 0.7152 * gMean + 0.0722 * bMean;

  // Variance indicates how "busy" the region is
  const variance = (
    stats.channels[0].stdev +
    stats.channels[1].stdev +
    stats.channels[2].stdev
  ) / 3;

  return { luminance, variance };
}

function selectContrastTreatment(
  luminance: number,
  variance: number,
  textColor: string
): ContrastTreatment {
  // High variance = busy background -> needs backdrop
  if (variance > 50) {
    return {
      type: 'backdrop',
      opacity: 0.6,
    };
  }

  // Low variance + extreme luminance -> stroke is sufficient
  if (variance < 25) {
    if (luminance > 0.7) {
      // Light background -> dark stroke
      return { type: 'stroke', strokeColor: 'rgba(0,0,0,0.5)', strokeWidth: 2 };
    }
    if (luminance < 0.3) {
      // Dark background -> light stroke
      return { type: 'stroke', strokeColor: 'rgba(255,255,255,0.3)', strokeWidth: 2 };
    }
  }

  // Medium variance -> drop shadow
  return {
    type: 'shadow',
    shadowOffset: 2,
    shadowBlur: 4,
  };
}
```

### Pattern 5: BudouX + Kinsoku Shori Line Breaking

**What:** Segment Japanese text into semantic phrases with BudouX, then apply kinsoku shori rules to prevent prohibited characters at line start/end.
**When to use:** Before rendering any Japanese text -- determines where line breaks occur.

```typescript
// Source: BudouX README (verified via GitHub)
import { loadDefaultJapaneseParser } from 'budoux';

const parser = loadDefaultJapaneseParser();

// JIS X 4051 prohibited characters
const KINSOKU_NOT_AT_LINE_START = new Set([
  // Closing brackets and punctuation
  '）', '〕', '〉', '》', '」', '』', '】', '〗', '〞',
  ')', ']', '}', '>',
  // Periods and commas
  '。', '．', '、', '，', '.', ',',
  // Other prohibited at start
  '：', '；', '？', '！', ':', ';', '?', '!',
  // Small kana
  'ー', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ', 'ゎ',
  'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ッ', 'ャ', 'ュ', 'ョ', 'ヮ',
  'ヵ', 'ヶ', '々', '〻',
  // Iteration marks
  'ヽ', 'ヾ', 'ゝ', 'ゞ',
  // Percentage, degree, etc.
  '%', '％', '°', '℃',
]);

const KINSOKU_NOT_AT_LINE_END = new Set([
  // Opening brackets
  '（', '〔', '〈', '《', '「', '『', '【', '〖', '〝',
  '(', '[', '{', '<',
  // Currency
  '¥', '￥', '$', '＄', '£', '￡',
]);

interface LineBreakResult {
  lines: string[];
  orientation: 'horizontal' | 'vertical';
}

function breakJapaneseText(
  text: string,
  maxWidthPx: number,
  fontSize: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): LineBreakResult {
  // Step 1: BudouX phrase segmentation
  const phrases = parser.parse(text);

  // Step 2: Estimate characters per line
  // For Japanese, each character is roughly fontSize wide
  const charsPerLine = Math.floor(maxWidthPx / fontSize);

  // Step 3: Assemble lines respecting kinsoku shori
  const lines: string[] = [];
  let currentLine = '';

  for (const phrase of phrases) {
    if (currentLine.length + phrase.length <= charsPerLine) {
      currentLine += phrase;
    } else {
      // Need to break -- but check kinsoku rules
      if (currentLine.length > 0) {
        // Check if last char of currentLine is prohibited at line end
        const lastChar = currentLine[currentLine.length - 1];
        if (KINSOKU_NOT_AT_LINE_END.has(lastChar)) {
          // Push the opening bracket to next line
          lines.push(currentLine.slice(0, -1));
          currentLine = lastChar + phrase;
        } else if (phrase.length > 0 && KINSOKU_NOT_AT_LINE_START.has(phrase[0])) {
          // Pull the closing punctuation back to current line
          currentLine += phrase[0];
          lines.push(currentLine);
          currentLine = phrase.slice(1);
        } else {
          lines.push(currentLine);
          currentLine = phrase;
        }
      } else {
        currentLine = phrase;
      }
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return { lines, orientation };
}
```

### Anti-Patterns to Avoid

- **Relying on Sharp SVG for vertical text without workaround:** Sharp/librsvg does not natively support CSS `writing-mode: vertical-rl`. Use character-by-character SVG placement or Pango gravity attributes instead.
- **Embedding custom fonts via base64 in SVG @font-face:** Does not work reliably in Sharp's librsvg renderer. Use system-installed fonts or `fontfile` parameter with Pango.
- **Running Sharp text compositing in Vercel serverless functions:** Vercel's serverless environment lacks Japanese fonts. Run compositing in n8n (self-hosted with fonts installed) or a dedicated compositing service.
- **Using Sharp composite with raw Buffers without .png():** When creating text buffers for compositing, always chain `.png().toBuffer()` before passing to composite. Raw buffers from text rendering may not composite correctly (verified via Sharp issue #3970).
- **Implementing kinsoku shori as character-level rules only:** Without phrase-level segmentation (BudouX), line breaks will occur at semantically wrong positions even if kinsoku rules are satisfied. Always segment first, then enforce kinsoku.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Japanese phrase segmentation | Character-counting line breaker | BudouX | ML-powered semantic segmentation; 15KB; handles compound words, particles, verb phrases |
| Image compositing engine | Canvas-based pixel manipulation | Sharp composite() | Already in project; hardware-accelerated via libvips; handles alpha, blend modes, positioning |
| Text rendering pipeline | Custom glyph-by-glyph renderer | Sharp input.text + Pango OR SVG overlay | Pango handles CJK metrics, kerning, font fallback; SVG handles rich styling |
| Layout intelligence | Edge detection + heuristic placement | Claude Vision API | Understands semantic content (faces, products, negative space); returns structured coordinates |
| Font management | Manual font file discovery | @fontsource npm packages + fontconfig | Provides consistent font paths; works in Docker; handles weight variants |
| Image region statistics | Manual pixel sampling | Sharp stats() on extracted regions | Returns per-channel min/max/mean/stdev/dominant; histogram-based; fast native C++ |
| WCAG contrast ratio | Custom luminance calculator | Formula: `(L1 + 0.05) / (L2 + 0.05)` using Sharp stats | Standard W3C formula; combine with Sharp's channel mean values |

**Key insight:** The compositing pipeline has zero novel computer vision problems. Sharp + Pango handle rendering, BudouX handles segmentation, Claude Vision handles layout intelligence, and Sharp stats handle contrast analysis. The novelty is in the *orchestration* -- connecting these tools into a pipeline that produces professional Japanese advertising creatives.

---

## Common Pitfalls

### Pitfall 1: Font Rendering Fails in Serverless/CI (Tofu Squares)

**What goes wrong:** Japanese text renders as empty rectangles ("tofu" or placeholder boxes) in production, despite working locally.
**Why it happens:** Sharp uses libvips -> Pango -> fontconfig. Serverless environments and containers lack CJK font files. fontconfig cannot find Noto Sans JP.
**How to avoid:**
1. Install Noto Sans JP font files in the compositing environment (Docker: copy to `/usr/share/fonts/`, run `fc-cache -f -v`)
2. For n8n self-hosted: install fonts on the host system
3. Set `FONTCONFIG_FILE` environment variable to a custom `fonts.conf` pointing to bundled font directory
4. Use Sharp's `fontfile` parameter to specify absolute path to .otf/.ttf file
5. Verify with a test string before production: `"テスト漢字ABCabc123"`
**Warning signs:** Empty images; images with only non-CJK text rendering; text working locally but blank in deployed environment.

### Pitfall 2: SVG Text Not Rendering Correctly in Sharp

**What goes wrong:** SVG text elements render with wrong font, wrong position, or not at all when composited via Sharp.
**Why it happens:** Sharp uses librsvg (not a full browser SVG renderer). librsvg has limited CSS support -- no `writing-mode`, limited `@font-face`, no `text-shadow` CSS property.
**How to avoid:**
1. Use inline SVG attributes (not CSS classes) for font, color, size
2. Use `paint-order="stroke"` with `stroke` and `stroke-width` attributes for text outlines (verified working in librsvg)
3. For shadows, render a separate darker text element offset by a few pixels, composited first
4. Keep SVG simple -- avoid CSS animations, filters, or complex selectors
5. Always test SVG rendering in Sharp before building the full pipeline
**Warning signs:** Text appearing as default sans-serif; CSS styles being ignored; SVG working in browser but not in Sharp output.

### Pitfall 3: Kinsoku Shori Bugs at Short Line Lengths

**What goes wrong:** At short line lengths (CTA buttons, narrow ad formats), kinsoku shori pushforward/pullback cascades -- moving one character forward to satisfy kinsoku creates a new violation on the previous line.
**Why it happens:** Kinsoku shori is a constraint satisfaction problem, not a simple per-line rule. Short lines have fewer characters to absorb pushforward/pullback.
**How to avoid:**
1. Set minimum line width to 6em (6 full-width characters) for kinsoku-compliant text
2. For narrower elements (CTA text), skip kinsoku and use single-line rendering
3. Implement a maximum cascade depth (2-3 iterations) and accept minor violations rather than infinite loops
4. Generate copy with character-count constraints that account for line width
**Warning signs:** Infinite loops in line-breaking code; single-character lines; text overflowing containers.

### Pitfall 4: Claude Vision Spatial Coordinate Accuracy

**What goes wrong:** Claude returns layout coordinates that are imprecise -- text overlaps the main subject, extends beyond image bounds, or coordinates drift between calls.
**Why it happens:** Claude's spatial reasoning is approximate. It works with relative positions but struggles with pixel-precise coordinates. Results are not deterministic.
**How to avoid:**
1. Provide exact image dimensions in the prompt (e.g., "this is a 1024x1024 image")
2. Validate all returned coordinates are within bounds before using them
3. Use grid-based snapping -- round coordinates to 20px grid after Claude returns them
4. Clamp all text elements with padding margins (e.g., 40px from edges)
5. Add a post-processing validation step that checks for text-text overlaps and text-edge overflow
6. Consider using Claude for *zone selection* (top-left, center, bottom-right) rather than pixel-precise coordinates, then calculate exact positions algorithmically
**Warning signs:** Text cut off at edges; text overlapping key image subjects; different coordinates each time for the same image.

### Pitfall 5: Vertical Text (Tategaki) Character Rotation Issues

**What goes wrong:** In vertical text mode, half-width characters (ABC, 123), punctuation, and small kana are not rotated correctly. Periods appear in the wrong position. Parentheses face the wrong direction.
**Why it happens:** Vertical CJK text has complex glyph rotation rules: full-width characters stay upright, half-width characters rotate 90 degrees clockwise, and punctuation has specific vertical variants.
**How to avoid:**
1. Use Pango's gravity system (`PANGO_GRAVITY_EAST`) which handles CJK vertical text rules automatically, including glyph substitution for vertical variants
2. If using SVG character-by-character approach: maintain a lookup table for characters needing rotation vs staying upright
3. Avoid mixing Latin text in vertical Japanese headlines (it creates awkward rotation)
4. For CTA elements, always use horizontal text (vertical CTAs are not convention in Japanese advertising)
**Warning signs:** Latin characters appearing sideways; punctuation in wrong position; parentheses facing the wrong direction in vertical text.

### Pitfall 6: Compositing Performance with Multiple Variants

**What goes wrong:** Generating 3 layout alternatives x 4 images per campaign = 12 composites. If each takes 2-3 seconds (including Claude Vision call), total time is 24-36 seconds on top of existing generation time.
**Why it happens:** Each composite requires a Claude Vision API call (layout analysis) + Sharp processing.
**How to avoid:**
1. Run compositing asynchronously (already established pattern from Phase 1)
2. Batch Claude Vision calls -- analyze all 4 images in a single API call if possible (up to 20 images per request)
3. Cache layout analysis results -- same base image always produces same layout suggestions
4. Sharp compositing itself is fast (~100ms per composite); the bottleneck is Claude Vision (~2-5s per call)
5. Consider analyzing images in parallel using Promise.all()
**Warning signs:** Campaign generation time more than doubling; timeout errors; users abandoning during generation.

---

## Code Examples

### Complete Compositing Pipeline Orchestrator

```typescript
// Source: Architecture pattern combining Sharp, BudouX, and Claude Vision
import sharp from 'sharp';
import { loadDefaultJapaneseParser } from 'budoux';
import { analyzeImageLayout } from './layout-engine';
import { breakJapaneseText } from './kinsoku';
import { analyzeRegionContrast, selectContrastTreatment } from './contrast-analyzer';
import { buildTextSvg, buildVerticalTextSvg } from './text-renderer';
import { compositeLogoOnImage } from './logo-placer';

interface CompositingInput {
  baseImageBuffer: Buffer;
  imageWidth: number;
  imageHeight: number;
  headline: string;
  tagline: string | null;
  cta: string;
  fontFamily: string;
  brandColors: { primary: string; accent: string };
  logoBuffer: Buffer | null;
}

interface CompositingResult {
  composites: Array<{
    layoutId: string;
    imageBuffer: Buffer;
    metadata: LayoutMetadata;
  }>;
}

async function compositeCampaignImage(
  input: CompositingInput
): Promise<CompositingResult> {
  // Step 1: Analyze image layout with Claude Vision
  const layouts = await analyzeImageLayout(
    input.baseImageBuffer,
    input.imageWidth,
    input.imageHeight,
    input.tagline !== null,
    input.logoBuffer !== null
  );

  // Step 2: Generate composites for each layout alternative
  const composites = await Promise.all(
    layouts.map(async (layout) => {
      let image = sharp(input.baseImageBuffer);
      const overlays: sharp.OverlayOptions[] = [];

      // Step 3: Calculate font sizes (ratio-based hierarchy)
      const baseFontSize = Math.round(input.imageWidth / 16); // ~64px for 1024px image
      const headlineSize = baseFontSize;
      const taglineSize = Math.round(baseFontSize * 0.6);
      const ctaSize = Math.round(baseFontSize * 0.7);

      // Step 4: Break text with kinsoku shori
      const headlineLines = breakJapaneseText(
        input.headline,
        layout.headline.maxWidth,
        headlineSize,
        layout.orientation
      );

      // Step 5: Analyze contrast for each text region
      const headlineContrast = await analyzeRegionContrast(
        input.baseImageBuffer,
        {
          x: layout.headline.x,
          y: layout.headline.y,
          width: layout.headline.maxWidth,
          height: headlineSize * (headlineLines.lines.length + 1),
        }
      );

      const treatment = selectContrastTreatment(
        headlineContrast.luminance,
        headlineContrast.variance,
        input.brandColors.primary
      );

      // Step 6: Choose text color based on background
      const textColor = headlineContrast.luminance > 0.5
        ? '#000000' // dark text on light bg
        : '#FFFFFF'; // light text on dark bg

      // Step 7: Render text overlay
      if (layout.orientation === 'vertical') {
        const verticalSvg = buildVerticalTextSvg(
          headlineLines.lines.join(''),
          headlineSize,
          input.fontFamily,
          textColor,
          treatment
        );
        overlays.push({
          input: verticalSvg,
          top: layout.headline.y,
          left: layout.headline.x,
        });
      } else {
        const textSvg = buildTextSvg({
          text: headlineLines.lines.join('\n'),
          fontSize: headlineSize,
          fontFamily: input.fontFamily,
          color: textColor,
          maxWidth: layout.headline.maxWidth,
          align: layout.headline.align,
          x: 0, y: 0,
        }, treatment);
        overlays.push({
          input: textSvg,
          top: layout.headline.y,
          left: layout.headline.x,
        });
      }

      // Add tagline and CTA similarly...

      // Step 8: Add logo if present
      if (input.logoBuffer && layout.logo) {
        overlays.push({
          input: await sharp(input.logoBuffer)
            .resize(Math.round(input.imageWidth * 0.12)) // Logo ~12% of image width
            .png()
            .toBuffer(),
          top: layout.logo.y,
          left: layout.logo.x,
        });
      }

      // Step 9: Composite all overlays
      const composited = await image.composite(overlays).png().toBuffer();

      return {
        layoutId: layout.id,
        imageBuffer: composited,
        metadata: {
          layout,
          treatment,
          headlineLines: headlineLines.lines,
          fontFamily: input.fontFamily,
          fontSize: headlineSize,
        },
      };
    })
  );

  return { composites };
}
```

### Font Configuration for Server-Side Rendering

```xml
<!-- fonts.conf -- fontconfig configuration for compositing environment -->
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/app/fonts</dir>
  <cachedir>/tmp/fontconfig-cache</cachedir>
  <match target="pattern">
    <test name="family">
      <string>Noto Sans JP</string>
    </test>
    <edit name="file" mode="assign">
      <string>/app/fonts/NotoSansJP-Regular.otf</string>
    </edit>
  </match>
</fontconfig>
```

```dockerfile
# Dockerfile snippet for compositing service
FROM node:20-slim

# Install fontconfig and CJK fonts
RUN apt-get update && apt-get install -y fontconfig && rm -rf /var/lib/apt/lists/*

# Copy font files
COPY fonts/ /usr/share/fonts/noto/
RUN fc-cache -f -v

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
```

### Vertical Text (Tategaki) SVG Rendering

```typescript
// Character-by-character vertical text rendering via SVG
function buildVerticalTextSvg(
  text: string,
  fontSize: number,
  fontFamily: string,
  color: string,
  treatment: ContrastTreatment
): Buffer {
  const charHeight = fontSize * 1.2; // Line spacing
  const totalHeight = text.length * charHeight + 20;
  const width = fontSize + 40; // Single column + padding

  let textElements = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const y = 20 + i * charHeight + fontSize;
    const x = 20;

    // Check if character needs rotation (half-width Latin/numbers)
    const needsRotation = /[A-Za-z0-9]/.test(char);

    if (needsRotation) {
      // Rotate 90 degrees clockwise for half-width chars in vertical text
      textElements += `<text x="${x}" y="${y}"
        font-family="${fontFamily}" font-size="${fontSize}" fill="${color}"
        transform="rotate(90, ${x + fontSize/2}, ${y - fontSize/2})"
        text-anchor="middle">${char}</text>`;
    } else {
      textElements += `<text x="${x}" y="${y}"
        font-family="${fontFamily}" font-size="${fontSize}" fill="${color}"
        text-anchor="start">${escapeXml(char)}</text>`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    width="${width}" height="${totalHeight}">
    ${textElements}
  </svg>`;

  return Buffer.from(svg);
}
```

### Storage Strategy: Flat PNG + Layout Metadata

```typescript
// Store composited images and their layout metadata for Phase 5 re-rendering
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';
import { adminClient } from '@/lib/supabase/admin';

interface LayoutMetadata {
  layoutId: string;
  orientation: 'horizontal' | 'vertical';
  headline: { text: string; x: number; y: number; fontSize: number; lines: string[] };
  tagline?: { text: string; x: number; y: number; fontSize: number; lines: string[] };
  cta: { text: string; x: number; y: number; fontSize: number };
  logo?: { x: number; y: number; width: number };
  treatment: ContrastTreatment;
  fontFamily: string;
  brandColors: { primary: string; accent: string };
  baseImageAssetId: string; // Reference to original Flux-generated image
}

async function storeCompositedImage(
  campaignId: string,
  layoutId: string,
  imageBuffer: Buffer,
  metadata: LayoutMetadata
): Promise<void> {
  const BUCKET = 'composited-images';
  const filePath = `${campaignId}/${layoutId}-${Date.now()}.png`;

  // Upload composited PNG to Supabase Storage
  await adminClient.storage
    .from(BUCKET)
    .upload(filePath, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    });

  const { data: { publicUrl } } = adminClient.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  // Store asset with layout metadata for Phase 5 re-rendering
  await db.insert(assets).values({
    campaignId,
    type: 'composited_image',
    storageKey: filePath,
    fileName: `composite-${layoutId}.png`,
    mimeType: 'image/png',
    modelUsed: 'sharp-composite',
    metadata: metadata as unknown as Record<string, unknown>,
  });
}
```

---

## Discretion Recommendations

These are areas marked as "Claude's Discretion" in CONTEXT.md. Research findings inform these recommendations.

### Compositing Timing: Async (Recommended)

**Recommendation:** Run compositing asynchronously, extending the existing Phase 1 generation pipeline.

**Rationale:**
- Claude Vision layout analysis adds 2-5 seconds per image
- 4 base images x 3 layouts = 12 composites per campaign
- Total compositing time estimated at 15-30 seconds
- The existing pipeline already runs asynchronously (via n8n or direct generation) with Supabase Realtime progress updates
- Add compositing as a new stage after image generation, before marking campaign complete

**Pipeline flow:**
1. Copy generation (existing) -> 2. Image generation (existing) -> 3. **Layout analysis** (new) -> 4. **Text compositing** (new) -> 5. Complete

### Storage Strategy: Flat PNG + Layout Metadata JSON (Recommended)

**Recommendation:** Store both the composited PNG (for immediate display) and the layout metadata JSON (for Phase 5 re-rendering).

**Rationale:**
- Phase 5 drag-and-drop requires knowing where text elements are positioned
- Storing layout metadata in the `assets.metadata` JSONB column enables re-rendering with modified positions
- The base image asset ID is included in metadata so the original Flux image can be re-composited with new text positions
- No need for a separate "layers" table -- JSONB metadata is sufficient
- Flat PNG is needed for immediate display and Phase 3 resizing

### Safe-Area Detection Approach: Claude Vision + Pixel Validation (Recommended)

**Recommendation:** Use Claude Vision API for semantic layout analysis, validate with Sharp pixel statistics.

**Rationale:**
- Claude understands image semantics (faces, products, negative space) -- not just pixel brightness
- Claude can propose 3 distinct alternatives with different creative approaches
- Sharp's stats() validates that text regions actually have sufficient contrast
- Two-pass approach: Claude for intelligence, Sharp for verification
- Cost: ~$0.005 per image analysis (1024x1024 at ~1334 tokens, Sonnet pricing)

### Contrast Treatment Thresholds (Recommended)

**Recommendation:** Three-tier system based on region variance and luminance:

| Condition | Treatment | Parameters |
|-----------|-----------|------------|
| High variance (stdev > 50) | Semi-transparent backdrop | Black 60% opacity, 8px border-radius |
| Low variance, extreme luminance (< 0.3 or > 0.7) | Text stroke | Contrasting color, 2px width, paint-order: stroke |
| Medium variance (25-50) | Drop shadow | 2px offset, 4px blur, contrasting color |

These thresholds should be tuned empirically during development. Start conservative (more backdrops) and relax toward strokes/shadows as quality improves.

### Vertical Text Criteria (Recommended)

**Recommendation:** Offer tategaki as one of the 3 layout alternatives when these conditions are met:

1. The image has a vertical safe area (tall narrow region with low complexity)
2. The headline is 12 characters or fewer (long headlines look awkward vertically)
3. The headline contains primarily CJK characters (minimal Latin/numbers)
4. The format is not a wide banner (aspect ratio > 1.5:1 horizontal = skip tategaki)

Claude Vision should evaluate these criteria during layout analysis and include tategaki as alternative C when appropriate. If conditions are not met, all 3 alternatives should be horizontal.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas-based text rendering | Sharp input.text with Pango | Sharp 0.32+ (2023) | Native text support without node-canvas dependency |
| Manual word-count line breaking for CJK | BudouX ML-powered phrase segmentation | 2023-2024 | Semantically correct line breaks for Japanese |
| Hard-coded text placement rules | LLM Vision for layout intelligence | 2024-2025 | Context-aware placement that understands image content |
| System-font-only rendering | fontfile parameter + @fontsource packages | Sharp 0.33+ | Bundled fonts for consistent rendering across environments |
| CSS writing-mode for vertical text | SVG/Pango gravity for server-side | N/A | Browser CSS does not apply in server-side Sharp rendering |

**Deprecated/outdated:**
- **node-canvas for server-side text rendering:** Requires system Cairo/Pango installation. Sharp bundles libvips with Pango, making node-canvas unnecessary for this use case.
- **lovell/attention (saliency detection):** No longer maintained. Claude Vision provides superior semantic understanding for layout.
- **overlayWith() in Sharp:** Deprecated in favor of composite(). Use `.composite([...])` for all overlay operations.

---

## Open Questions

1. **Sharp + Pango vertical text via gravity attributes**
   - What we know: Pango supports `PangoGravity` for vertical CJK text layout. Sharp wraps libvips which wraps Pango.
   - What's unclear: Whether Sharp's `input.text` exposes Pango gravity settings. The Sharp API documentation does not mention gravity or vertical text parameters.
   - Recommendation: Test empirically with Sharp `input.text` and Pango markup attributes. If gravity is not exposed, fall back to character-by-character SVG rendering for tategaki. This is LOW risk -- vertical text is only used in ~1/3 of layout alternatives.

2. **Claude Vision coordinate precision for 1024x1024 images**
   - What we know: Claude can return bounding boxes and coordinates. Spatial reasoning is listed as a limitation.
   - What's unclear: Exactly how precise Claude's pixel coordinates are for advertising layout. Will coordinates be within 20px? 50px? 100px?
   - Recommendation: Build the pipeline with coordinate snapping/validation. Test with 10-20 sample images to calibrate precision. Use Claude for zone selection and calculate exact pixel positions from zone rules if precision is insufficient.

3. **BudouX accuracy for advertising copy**
   - What we know: BudouX handles general Japanese text segmentation well.
   - What's unclear: How well BudouX handles advertising-specific language (short catchy phrases, katakana brand names, mixed script).
   - Recommendation: Test BudouX with the existing copy variant examples from the keigo constants. If segmentation is poor for ad copy, implement a hybrid approach: BudouX for long text, character-width estimation for short headlines.

4. **Performance of 12 composites per campaign**
   - What we know: Sharp compositing is fast (~100ms). Claude Vision is slower (~2-5s per call).
   - What's unclear: Whether batching 4 images into a single Claude Vision call with 3 layout alternatives each produces coherent results, or whether individual calls are needed.
   - Recommendation: Test batch analysis first (single API call with 4 images). If quality is poor, fall back to individual calls and run them in parallel.

---

## Sources

### Primary (HIGH confidence)
- [Sharp composite API](https://sharp.pixelplumbing.com/api-composite/) - Composite operations, overlay positioning, blend modes (verified via Context7: /lovell/sharp)
- [Sharp input.text API](https://sharp.pixelplumbing.com/api-constructor/) - Text rendering options, Pango markup, font/dpi/wrap parameters (verified via Context7: /websites/sharp_pixelplumbing)
- [Sharp stats API](https://sharp.pixelplumbing.com/api-input/) - Per-channel statistics, dominant color, entropy (verified via Context7: /lovell/sharp)
- [Claude Vision API docs](https://platform.claude.com/docs/en/build-with-claude/vision) - Image input formats, limits, structured output with tools
- [BudouX GitHub/npm](https://github.com/google/budoux) - Japanese phrase segmentation API, parse() method, 15KB model
- [Pango Markup Reference](https://docs.gtk.org/Pango/pango_markup.html) - span attributes: foreground, background, font_family, font_size, weight, letter_spacing
- [Pango Vertical Text](https://docs.gtk.org/Pango/pango_bidi.html) - PangoGravity, GRAVITY_EAST, vertical CJK glyph handling

### Secondary (MEDIUM confidence)
- [Sharp issue #3970](https://github.com/lovell/sharp/issues/3970) - Vertical text workaround: .png().toBuffer() chain before composite
- [Sharp issue #3109](https://github.com/lovell/sharp/issues/3109) - Unicode/CJK font rendering on Lambda: FONTCONFIG_FILE env var + bundled fonts
- [Sharp issue #2499](https://github.com/lovell/sharp/issues/2499) - Font rendering on Vercel: system font dependency issues
- [W3C Relative Luminance](https://www.w3.org/WAI/GL/wiki/Relative_luminance) - WCAG luminance formula: 0.2126R + 0.7152G + 0.0722B
- [Kinsoku Shori Wikipedia](https://en.wikipedia.org/wiki/Line_breaking_rules_in_East_Asian_languages) - JIS X 4051 prohibited character lists
- [@fontsource/noto-sans-jp](https://www.npmjs.com/package/@fontsource/noto-sans-jp) - npm font package for server-side rendering

### Tertiary (LOW confidence)
- Claude Vision bounding box precision for advertising layout -- no published benchmarks for this specific use case; requires empirical testing
- BudouX accuracy for advertising-specific Japanese copy -- general NLP benchmarks exist but not advertising-specific evaluation
- Pango gravity exposure through Sharp API -- undocumented; requires empirical testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Sharp already installed; BudouX verified via npm/GitHub; Claude Vision API documented
- Architecture: HIGH - Patterns follow established Sharp composite + Claude tool_use patterns from Phase 1
- Pitfalls: HIGH - Font rendering issues well-documented in Sharp issues; kinsoku rules sourced from JIS standard
- Layout intelligence (Claude Vision): MEDIUM - Approach is sound but coordinate precision needs empirical validation
- Vertical text: MEDIUM - Pango supports it theoretically; Sharp exposure is unclear; SVG fallback is reliable

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - Sharp and BudouX are stable; Claude Vision API is GA)
