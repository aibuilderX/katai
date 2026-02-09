import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { regenerateCopyVariant, regenerateImage } from "@/lib/ai/regeneration"

interface RegenerateBody {
  type: "copy_variant" | "image"
  assetId?: string
  platform?: string
  variantLabel?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { id: campaignId } = await params
    const body: RegenerateBody = await request.json()

    // Validate required fields based on type
    if (!body.type) {
      return NextResponse.json(
        { error: "再生成タイプを指定してください" },
        { status: 400 }
      )
    }

    if (body.type === "copy_variant") {
      if (!body.platform || !body.variantLabel) {
        return NextResponse.json(
          {
            error:
              "コピー再生成にはplatformとvariantLabelが必要です",
          },
          { status: 400 }
        )
      }

      const updated = await regenerateCopyVariant(
        campaignId,
        body.platform,
        body.variantLabel
      )

      return NextResponse.json({ variant: updated })
    }

    if (body.type === "image") {
      if (!body.assetId) {
        return NextResponse.json(
          { error: "画像再生成にはassetIdが必要です" },
          { status: 400 }
        )
      }

      const updated = await regenerateImage(campaignId, body.assetId)

      return NextResponse.json({ asset: updated })
    }

    return NextResponse.json(
      { error: "無効な再生成タイプです" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[regenerate] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "再生成に失敗しました",
      },
      { status: 500 }
    )
  }
}
