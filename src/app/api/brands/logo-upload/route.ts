import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { adminClient } from "@/lib/supabase/admin"
import { extractPaletteFromLogo } from "@/lib/utils/color-extract"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"]
const BUCKET_NAME = "brand-logos"

/**
 * POST /api/brands/logo-upload
 * Upload a brand logo to Supabase Storage and extract color palette.
 */
export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  // Parse form data
  const formData = await request.formData()
  const file = formData.get("logo") as File | null

  if (!file) {
    return NextResponse.json(
      { error: "ファイルが見つかりません" },
      { status: 400 }
    )
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "対応していないファイル形式です。PNG、JPG、SVGをアップロードしてください。" },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "ファイルサイズは5MB以下にしてください" },
      { status: 400 }
    )
  }

  try {
    // Ensure bucket exists (admin client for storage operations)
    const { data: buckets } = await adminClient.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)

    if (!bucketExists) {
      await adminClient.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      })
    }

    // Generate unique file path
    const ext = file.name.split(".").pop() || "png"
    const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json(
        { error: "ファイルのアップロードに失敗しました" },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(filePath)

    // Extract color palette (skip for SVG as sharp may not handle SVG well)
    let extractedColors: { hex: string; area: number }[] = []
    if (file.type !== "image/svg+xml") {
      try {
        extractedColors = await extractPaletteFromLogo(arrayBuffer)
      } catch (extractError) {
        console.error("Color extraction failed:", extractError)
        // Non-fatal: continue without extracted colors
      }
    }

    return NextResponse.json({
      url: publicUrl,
      extractedColors,
    })
  } catch (error) {
    console.error("Logo upload error:", error)
    return NextResponse.json(
      { error: "ロゴの処理中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
