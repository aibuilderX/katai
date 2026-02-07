import { extractColorsFromImageData } from "extract-colors"
import sharp from "sharp"

/**
 * Extract a color palette from a logo image buffer.
 * Uses sharp to convert the image to raw pixel data, then
 * extract-colors to find dominant colors.
 * Returns the top 5 dominant colors sorted by area coverage.
 */
export async function extractPaletteFromLogo(
  imageBuffer: ArrayBuffer
): Promise<{ hex: string; area: number }[]> {
  // Use sharp to get raw RGBA pixel data
  const { data, info } = await sharp(Buffer.from(imageBuffer))
    .resize(200, 200, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const imageData = {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    width: info.width,
    height: info.height,
  }

  const colors = extractColorsFromImageData(imageData, {
    pixels: 10000,
    distance: 0.2,
    saturationDistance: 0.5,
    lightnessDistance: 0.2,
    hueDistance: 0.1,
  })

  return colors
    .sort((a, b) => b.area - a.area)
    .slice(0, 5)
    .map((c) => ({
      hex: c.hex,
      area: c.area,
    }))
}
