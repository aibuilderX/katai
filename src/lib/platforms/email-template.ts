// ---------------------------------------------------------------------------
// HTML Email Template Generator
//
// Produces Outlook-compatible, table-based HTML with all CSS inline.
// Designed for Japanese promotional emails with brand styling.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailTemplateParams {
  headline: string
  bodyText: string
  ctaText: string
  ctaUrl: string
  headerImageUrl: string
  brandName: string
  brandColors: {
    primary: string
    accent: string
    background: string
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a complete HTML email document with table-based layout.
 *
 * - All CSS is inline (Outlook strips `<style>` blocks)
 * - No flexbox/grid (Outlook incompatible)
 * - Max width 600px (standard email width)
 * - Font stack includes Japanese-safe fallbacks
 * - Total output is well under Gmail's 102KB clipping threshold
 */
export function buildEmailHtml(params: EmailTemplateParams): string {
  const headline = escapeHtml(params.headline)
  const bodyText = escapeHtml(params.bodyText)
  const ctaText = escapeHtml(params.ctaText)
  const brandName = escapeHtml(params.brandName)

  // URLs are used in href/src attributes -- encode but don't HTML-escape
  const ctaUrl = params.ctaUrl
  const headerImageUrl = params.headerImageUrl

  const accentColor = params.brandColors.accent || "#0066CC"
  const outerBg = params.brandColors.background || "#f5f5f5"
  const fontStack =
    "'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', sans-serif"

  return `<!DOCTYPE html>
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${headline}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${outerBg};font-family:${fontStack};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Outer wrapper table -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${outerBg};">
  <tr>
    <td align="center" style="padding:24px 16px;">

      <!-- Inner content table (600px max) -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- Header image row -->
        <tr>
          <td style="padding:0;line-height:0;font-size:0;">
            <img src="${headerImageUrl}" alt="${headline}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>

        <!-- Headline row -->
        <tr>
          <td style="padding:32px 32px 16px 32px;">
            <h1 style="margin:0;font-family:${fontStack};font-size:22px;line-height:1.4;color:#1a1a1a;font-weight:bold;">${headline}</h1>
          </td>
        </tr>

        <!-- Body text row -->
        <tr>
          <td style="padding:0 32px 24px 32px;">
            <p style="margin:0;font-family:${fontStack};font-size:16px;line-height:1.8;color:#333333;">${bodyText}</p>
          </td>
        </tr>

        <!-- CTA button row -->
        <tr>
          <td align="center" style="padding:8px 32px 32px 32px;">
            <!-- Table-based button for Outlook compatibility -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background-color:${accentColor};border-radius:4px;">
                  <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-family:${fontStack};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:4px;background-color:${accentColor};line-height:1.4;">${ctaText}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer row -->
        <tr>
          <td style="padding:16px 32px 24px 32px;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:1.6;color:#999999;text-align:center;">&copy; ${brandName}</p>
          </td>
        </tr>

      </table>
      <!-- /Inner content table -->

    </td>
  </tr>
</table>
<!-- /Outer wrapper table -->

</body>
</html>`
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Escape HTML special characters in user-provided text to prevent
 * XSS / injection in the generated email HTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
