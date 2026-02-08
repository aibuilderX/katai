/**
 * ZIP Download Endpoint
 *
 * GET /api/campaigns/[id]/download
 *
 * Streams a ZIP archive of the campaign kit (platform images, copy text
 * files, composited images, email HTML) to the client.
 *
 * Auth: requires authenticated user belonging to the campaign's team.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { campaigns, teamMembers, assets } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { buildCampaignZip } from "@/lib/platforms/zip-packager"

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

  // Authenticate
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  // Find user's team
  const membership = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1)

  if (membership.length === 0) {
    return NextResponse.json(
      { error: "チームが見つかりません" },
      { status: 403 }
    )
  }

  const teamId = membership[0].teamId

  // Verify campaign belongs to user's team
  const campaignResult = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.teamId, teamId)))
    .limit(1)

  if (campaignResult.length === 0) {
    return NextResponse.json(
      { error: "キャンペーンが見つかりません" },
      { status: 404 }
    )
  }

  // Check if campaign has any downloadable assets
  const downloadableAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.campaignId, id))
    .limit(1)

  if (downloadableAssets.length === 0) {
    return NextResponse.json(
      { error: "ダウンロード可能なアセットがありません" },
      { status: 404 }
    )
  }

  // Build ZIP archive
  const { stream: passthrough, fileName } = await buildCampaignZip(id)

  // Convert Node PassThrough stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      passthrough.on("end", () => {
        controller.close()
      })
      passthrough.on("error", (err: Error) => {
        controller.error(err)
      })
    },
  })

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
